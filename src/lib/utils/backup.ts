import { storage } from '@wxt-dev/storage'
import type { Collection, SimpleTrack } from '$lib/stores/data/cache'
import { MAX_AUDIO_PRESETS, type AudioPreset, type ConfigState } from '$lib/stores/config'
import { migrateReverbMix, REVERB_MIX_VERSION, type ReverbParams } from '$lib/stores/reverb-params'
import type { Look, LooksState } from '$lib/types/look'
import { WALLPAPER_KEY_PREFIX, release, type StoredWallpaper } from './wallpapers'
import { lookWallpaperId, sanitiseLook, sanitiseWallpaper } from './look-file'

/**
 * Backup and restore of everything Chorus keeps for a person: the library
 * (snips, blocked tracks, per-track speeds), saved presets, saved looks with
 * their pictures, and every setting, as one plain JSON file. Nothing here
 * talks to a server; the file is written to and read from the person's own
 * disk.
 */

export const BACKUP_APP = 'chorus'
/** Bump when the file's own shape changes; stored values carry their own migrations. */
export const BACKUP_FORMAT = 1
/** When the last backup file was saved (ms since epoch). Not part of a backup itself. */
export const LAST_BACKUP_KEY = 'local:chorus_backup_at'

/**
 * The storage keys (without the `local:` area) a backup carries, in the order
 * they are restored. Session state (now playing, PiP, master switch, the open
 * tab) and Spotify credentials are deliberately left out.
 */
export const BACKUP_KEYS = [
    'chorus_collection', // snips, blocked tracks, per-track speeds
    'chorus_discography', // progress through artists' albums
    'chorus_discography_prefs', // what counts towards it, auto-track
    'chorus_settings',
    'chorus_looks', // saved looks and hidden built-ins; their pictures ride in `wallpapers`
    'chorus_config', // auto-skip rules, Mine presets, hidden preset lists
    'chorus_playback',
    'chorus_seek',
    'chorus_volume',
    'chorus_loop',
    'chorus_audio_effects',
    'chorus_lofi',
    'chorus_preset_group',
    'chorus_preset_origin',
    'chorus_eq_bands',
    'chorus_reverb_params',
    'chorus_reverb_params_version',
    'chorus_ms_params',
    'chorus_effect_frequents',
    'chorus_user_eq_presets',
    'chorus_user_reverb_presets',
    'chorus_user_reverb_presets_version',
    'chorus_blocked_view'
] as const

export type BackupKey = (typeof BACKUP_KEYS)[number]
export type BackupData = Partial<Record<BackupKey, unknown>>

export type Backup = {
    app: typeof BACKUP_APP
    format: number
    /** The extension version that wrote the file. */
    version: string
    /** ISO timestamp of the export. */
    exported_at: string
    data: BackupData
    /** The pictures the saved looks keep in Chorus, by wallpaper id. An older Chorus ignores this. */
    wallpapers?: Record<string, StoredWallpaper>
}

/** `add` folds the file's library into the current one; `replace` takes everything from the file. */
export type RestoreMode = 'add' | 'replace'

export type BackupSummary = {
    snips: number
    blocked: number
    speeds: number
    eq_presets: number
    reverb_presets: number
    mine_presets: number
    looks: number
    /** What the looks' pictures weigh in the file, before base64. */
    picture_bytes: number
    settings: boolean
}

/** Keys are storage keys without the `local:` area: a BackupKey, or a wallpaper's. */
export interface BackupStorage {
    get<T = unknown>(key: string): Promise<T | null>
    set(key: string, value: unknown): Promise<void>
    remove(key: string): Promise<void>
}

/** `chorus_wallpaper_`: the storage key prefix (without the area) a look's picture lives under. */
const WALLPAPER_PREFIX = WALLPAPER_KEY_PREFIX.replace(/^local:/, '')
const wallpaperKey = (id: string) => `${WALLPAPER_PREFIX}${id}`

const extensionStorage: BackupStorage = {
    get: (key) => storage.getItem(`local:${key}`),
    set: async (key, value) => {
        await storage.setItem(`local:${key}`, value)
        // A picture restored over one this page has already loaded is re-read next time.
        if (key.startsWith(WALLPAPER_PREFIX)) release(key.slice(WALLPAPER_PREFIX.length))
    },
    remove: (key) => storage.removeItem(`local:${key}`)
}

const looksOf = (data: BackupData): Look[] =>
    Object.values((data.chorus_looks as LooksState | undefined)?.looks ?? {})

/** The wallpaper ids the looks in `data` name, in look order. */
const wallpaperIds = (data: BackupData): string[] =>
    looksOf(data)
        .map(lookWallpaperId)
        .filter((id): id is string => Boolean(id))

export class BackupError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'BackupError'
    }
}

const VERSION_KEYS = new Set<BackupKey>([
    'chorus_reverb_params_version',
    'chorus_user_reverb_presets_version'
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {})

export async function createBackup(
    version: string,
    store: BackupStorage = extensionStorage
): Promise<Backup> {
    const data: BackupData = {}
    for (const key of BACKUP_KEYS) {
        const value = await store.get(key)
        if (value !== null && value !== undefined) data[key] = value
    }
    const wallpapers: Record<string, StoredWallpaper> = {}
    for (const id of wallpaperIds(data)) {
        const stored = await store.get<StoredWallpaper>(wallpaperKey(id))
        if (stored) wallpapers[id] = stored
    }
    return {
        app: BACKUP_APP,
        format: BACKUP_FORMAT,
        version,
        exported_at: new Date().toISOString(),
        data,
        ...(Object.keys(wallpapers).length ? { wallpapers } : {})
    }
}

export const serializeBackup = (backup: Backup): string => JSON.stringify(backup, null, 2)

export function backupFileName(backup: Backup): string {
    const day = (backup.exported_at || new Date().toISOString()).slice(0, 10)
    return `chorus-backup-${day}.json`
}

/**
 * Read a backup file. Throws a BackupError with a sentence for the person when
 * the file is not one of ours; unknown keys and malformed values are dropped,
 * only a damaged library is fatal.
 */
export function parseBackup(text: string): Backup {
    let raw: unknown
    try {
        raw = JSON.parse(text)
    } catch {
        throw new BackupError('That file is not JSON.')
    }
    if (!isRecord(raw) || raw.app !== BACKUP_APP || !isRecord(raw.data)) {
        throw new BackupError('That file is not a Chorus backup.')
    }
    const format = typeof raw.format === 'number' ? raw.format : 0
    if (format > BACKUP_FORMAT) {
        throw new BackupError(
            'This backup was made by a newer Chorus. Update the extension, then try again.'
        )
    }

    const data: BackupData = {}
    for (const key of BACKUP_KEYS) {
        const value = raw.data[key]
        if (value === undefined || value === null) continue
        if (key === 'chorus_collection') data[key] = cleanCollection(value)
        else if (key === 'chorus_looks') data[key] = cleanLooks(value)
        else if (VERSION_KEYS.has(key)) {
            if (typeof value === 'number') data[key] = value
        } else if (isRecord(value)) data[key] = value
    }

    // Only the pictures the file's looks name, each checked.
    const wallpapers: Record<string, StoredWallpaper> = {}
    if (isRecord(raw.wallpapers)) {
        for (const id of wallpaperIds(data)) {
            const stored = sanitiseWallpaper(raw.wallpapers[id])
            if (stored) wallpapers[id] = stored
        }
    }

    return {
        app: BACKUP_APP,
        format,
        version: typeof raw.version === 'string' ? raw.version : 'unknown',
        exported_at: typeof raw.exported_at === 'string' ? raw.exported_at : '',
        data,
        ...(Object.keys(wallpapers).length ? { wallpapers } : {})
    }
}

/** The looks a file carries, each checked field by field; a damaged record is dropped, not fatal. */
function cleanLooks(value: unknown): LooksState {
    const raw = isRecord(value) ? value : {}
    const looks: Record<string, Look> = {}
    if (isRecord(raw.looks)) {
        for (const [id, record] of Object.entries(raw.looks)) {
            const look = sanitiseLook(record)
            if (look) looks[id] = { ...look, id }
        }
    }
    return {
        version: 1,
        looks,
        hiddenBuiltIn: Array.isArray(raw.hiddenBuiltIn)
            ? raw.hiddenBuiltIn.filter((id): id is string => typeof id === 'string')
            : []
    }
}

/** Keep the entries storage itself keeps: tracks with a snip, a block, a speed or a volume offset. */
function cleanCollection(value: unknown): Collection {
    if (!isRecord(value)) throw new BackupError('The library in that backup is damaged.')
    const collection: Collection = {}
    for (const [id, track] of Object.entries(value)) {
        if (!isRecord(track)) continue
        if (!track.snip && !track.blocked && !track.playback && track.volume == null) continue
        const track_id = typeof track.track_id === 'string' ? track.track_id : id
        collection[track_id] = { ...(track as SimpleTrack), track_id }
    }
    return collection
}

export function summarizeBackup(
    data: BackupData,
    wallpapers: Record<string, StoredWallpaper> = {}
): BackupSummary {
    const tracks = Object.values((data.chorus_collection as Collection | undefined) ?? {})
    const config = data.chorus_config as Partial<ConfigState> | undefined
    return {
        snips: tracks.filter((track) => track.snip).length,
        blocked: tracks.filter((track) => track.blocked).length,
        speeds: tracks.filter((track) => track.playback).length,
        eq_presets: Object.keys(asRecord(data.chorus_user_eq_presets)).length,
        reverb_presets: Object.keys(asRecord(data.chorus_user_reverb_presets)).length,
        mine_presets: Array.isArray(config?.audio_presets) ? config.audio_presets.length : 0,
        looks: looksOf(data).length,
        picture_bytes: Object.values(wallpapers).reduce((sum, w) => sum + (w.bytes || 0), 0),
        settings: data.chorus_settings !== undefined
    }
}

const count = (n: number, noun: string) => (n ? `${n} ${noun}${n === 1 ? '' : 's'}` : '')

/** "41 snips · 12 blocked tracks · 2 EQ presets · settings", for a file preview or a toast. */
export function describeSummary(summary: BackupSummary): string {
    const parts = [
        count(summary.snips, 'snip'),
        count(summary.blocked, 'blocked track'),
        count(summary.speeds, 'track speed'),
        count(summary.eq_presets, 'EQ preset'),
        count(summary.reverb_presets, 'reverb preset'),
        count(summary.mine_presets, 'Mine preset'),
        count(summary.looks, 'look')
    ].filter(Boolean)
    if (summary.settings) parts.push('settings')
    return parts.length ? parts.join(' · ') : 'an empty library'
}

/**
 * Reverb values saved before the dry-mix rework (REVERB_MIX_VERSION) are
 * brought up to the current mix, exactly as the stores do on load, so a file
 * from an older Chorus restores with the balance it had.
 */
function withCurrentReverbMix(data: BackupData): BackupData {
    const next: BackupData = { ...data }
    const presets = data.chorus_user_reverb_presets
    if (isRecord(presets)) {
        const version = Number(data.chorus_user_reverb_presets_version ?? 1)
        if (version < REVERB_MIX_VERSION) {
            next.chorus_user_reverb_presets = Object.fromEntries(
                Object.entries(presets).map(([name, params]) => [
                    name,
                    migrateReverbMix(params as ReverbParams)
                ])
            )
        }
        next.chorus_user_reverb_presets_version = REVERB_MIX_VERSION
    }
    const params = data.chorus_reverb_params
    if (isRecord(params)) {
        const version = Number(data.chorus_reverb_params_version ?? 1)
        if (version < REVERB_MIX_VERSION) {
            next.chorus_reverb_params = migrateReverbMix(params as ReverbParams)
        }
        next.chorus_reverb_params_version = REVERB_MIX_VERSION
    }
    return next
}

/** Per track, the file's fields win, so a local block survives a snip arriving for the same track. */
export function mergeCollections(current: Collection, incoming: Collection): Collection {
    const merged: Collection = { ...current }
    for (const [track_id, track] of Object.entries(incoming)) {
        merged[track_id] = { ...current[track_id], ...track }
    }
    return merged
}

/**
 * The file's looks that are new by id, renamed where a name is taken, folded
 * into the current ones; the hidden list stays as it is.
 */
export function mergeLooks(current: LooksState, incoming: LooksState): LooksState {
    const looks = { ...current.looks }
    const names = new Set(Object.values(looks).map((look) => look.name.toLowerCase()))
    let changed = false
    for (const [id, look] of Object.entries(incoming.looks)) {
        if (looks[id]) continue
        let name = look.name
        for (let n = 2; names.has(name.toLowerCase()); n++) name = `${look.name} ${n}`
        names.add(name.toLowerCase())
        looks[id] = { ...look, name }
        changed = true
    }
    return changed ? { ...current, looks } : current
}

/** Fill the free Mine slots with presets whose id and name are both new; the current ones keep their positions. */
export function mergeMinePresets(current: AudioPreset[], incoming: AudioPreset[]): AudioPreset[] {
    const slots = [...current]
    for (const preset of incoming) {
        if (slots.length >= MAX_AUDIO_PRESETS) break
        if (!isRecord(preset) || typeof preset.id !== 'string' || typeof preset.name !== 'string') {
            continue
        }
        if (slots.some((slot) => slot.id === preset.id || slot.name === preset.name)) continue
        slots.push(preset)
    }
    return slots.length === current.length ? current : slots
}

/**
 * Write a backup into storage. Every store watches its key, so open Chorus
 * surfaces pick the values up; the caller refreshes the in-page collection
 * cache. In `replace` mode keys the file does not carry are left as they are.
 * Returns what was restored.
 */
export async function applyBackup(
    backup: Backup,
    mode: RestoreMode,
    store: BackupStorage = extensionStorage
): Promise<BackupSummary> {
    const data = withCurrentReverbMix(backup.data)
    const wallpapers = backup.wallpapers ?? {}

    if (mode === 'replace') {
        const before = data.chorus_looks
            ? wallpaperIds({ chorus_looks: await currentLooks(store) })
            : []
        for (const key of BACKUP_KEYS) {
            if (data[key] !== undefined) await store.set(key, data[key])
        }
        const after = new Set(wallpaperIds(data))
        await writeWallpapers(store, [...after], wallpapers)
        // Pictures of looks the file has just replaced would otherwise sit in storage for good.
        for (const id of before) {
            if (!after.has(id)) await store.remove(wallpaperKey(id))
        }
        return summarizeBackup(data, wallpapers)
    }

    const incomingLooks = data.chorus_looks as LooksState | undefined
    if (incomingLooks && Object.keys(incomingLooks.looks).length) {
        const current = await currentLooks(store)
        const merged = mergeLooks(current, incomingLooks)
        if (merged !== current) {
            await store.set('chorus_looks', merged)
            const added = Object.keys(merged.looks).filter((id) => !current.looks[id])
            await writeWallpapers(
                store,
                added
                    .map((id) => lookWallpaperId(merged.looks[id]))
                    .filter((id): id is string => Boolean(id)),
                wallpapers
            )
        }
    }

    const incoming = data.chorus_collection as Collection | undefined
    if (incoming) {
        const current = (await store.get<Collection>('chorus_collection')) ?? {}
        await store.set('chorus_collection', mergeCollections(current, incoming))
    }

    if (isRecord(data.chorus_user_eq_presets)) {
        const current = asRecord(await store.get('chorus_user_eq_presets'))
        await store.set('chorus_user_eq_presets', { ...current, ...data.chorus_user_eq_presets })
    }

    if (isRecord(data.chorus_user_reverb_presets)) {
        const current = asRecord(await store.get('chorus_user_reverb_presets'))
        await store.set('chorus_user_reverb_presets', {
            ...current,
            ...data.chorus_user_reverb_presets
        })
        await store.set('chorus_user_reverb_presets_version', REVERB_MIX_VERSION)
    }

    const mine = (data.chorus_config as Partial<ConfigState> | undefined)?.audio_presets
    if (Array.isArray(mine) && mine.length) {
        const current = asRecord(await store.get('chorus_config')) as Partial<ConfigState>
        const slots = mergeMinePresets(current.audio_presets ?? [], mine)
        if (slots !== current.audio_presets) {
            await store.set('chorus_config', { ...current, audio_presets: slots })
        }
    }

    return { ...summarizeBackup(data, wallpapers), settings: false }
}

async function currentLooks(store: BackupStorage): Promise<LooksState> {
    return cleanLooks(await store.get('chorus_looks'))
}

/** Store the pictures the file carries for these ids; an id the file has no picture for is left as it is. */
async function writeWallpapers(
    store: BackupStorage,
    ids: string[],
    wallpapers: Record<string, StoredWallpaper>
): Promise<void> {
    for (const id of ids) {
        if (wallpapers[id]) await store.set(wallpaperKey(id), wallpapers[id])
    }
}
