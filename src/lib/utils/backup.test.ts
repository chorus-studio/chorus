import { describe, expect, it, vi } from 'vitest'

// backup.ts pulls in stores that hydrate from extension storage on import; stand that in.
vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))

import {
    BACKUP_FORMAT,
    BACKUP_KEYS,
    applyBackup,
    backupFileName,
    createBackup,
    describeSummary,
    mergeCollections,
    mergeMinePresets,
    parseBackup,
    summarizeBackup,
    type Backup,
    type BackupKey,
    type BackupStorage
} from './backup'
import { REVERB_MIX_VERSION } from '$lib/stores/reverb-params'
import type { AudioPreset } from '$lib/stores/config'

function memoryStore(initial: Partial<Record<BackupKey, unknown>> = {}) {
    const data = new Map<string, unknown>(Object.entries(initial))
    const store: BackupStorage & { data: Map<string, unknown> } = {
        data,
        get: async <T>(key: BackupKey) => (data.has(key) ? (data.get(key) as T) : null),
        set: async (key: BackupKey, value: unknown) => {
            data.set(key, value)
        }
    }
    return store
}

const snip = { mode: 'play', ranges: [{ start: 10, end: 40 }] }
const track = (track_id: string, extra: Record<string, unknown>) => ({
    song_id: `s-${track_id}`,
    track_id,
    ...extra
})

const file = (data: Record<string, unknown>, extra: Record<string, unknown> = {}): Backup => ({
    app: 'chorus',
    format: BACKUP_FORMAT,
    version: '2.10.0',
    exported_at: '2026-10-30T10:00:00.000Z',
    data,
    ...extra
})

const mine = (id: string, name: string) => ({ id, name }) as unknown as AudioPreset

describe('createBackup', () => {
    it('reads every key and leaves out the ones never written', async () => {
        const store = memoryStore({
            chorus_collection: { a: track('a', { snip }) },
            chorus_settings: { ui: {} }
        })
        const backup = await createBackup('2.10.0', store)
        expect(backup.app).toBe('chorus')
        expect(backup.format).toBe(BACKUP_FORMAT)
        expect(Object.keys(backup.data)).toEqual(['chorus_collection', 'chorus_settings'])
        expect(backup.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('names the file after the day it was made', () => {
        expect(backupFileName(file({}))).toBe('chorus-backup-2026-10-30.json')
    })
})

describe('parseBackup', () => {
    it('rejects what is not JSON, not ours, or from a newer Chorus', () => {
        expect(() => parseBackup('{nope')).toThrow('not JSON')
        expect(() => parseBackup('{"app":"other","data":{}}')).toThrow('not a Chorus backup')
        expect(() => parseBackup('[1,2]')).toThrow('not a Chorus backup')
        expect(() => parseBackup(JSON.stringify(file({}, { format: BACKUP_FORMAT + 1 })))).toThrow(
            'newer Chorus'
        )
    })

    it('keeps known keys with the right shape and drops the rest', () => {
        const parsed = parseBackup(
            JSON.stringify(
                file({
                    chorus_settings: { ui: { pip: true } },
                    chorus_playback: 'broken',
                    chorus_reverb_params_version: '2',
                    chorus_user_reverb_presets_version: 2,
                    chorus_auth_token: 'secret',
                    made_up: { x: 1 }
                })
            )
        )
        expect(parsed.data).toEqual({
            chorus_settings: { ui: { pip: true } },
            chorus_user_reverb_presets_version: 2
        })
        expect(parsed.version).toBe('2.10.0')
    })

    it('cleans the library: fills track ids from keys and drops bare entries', () => {
        const parsed = parseBackup(
            JSON.stringify(
                file({
                    chorus_collection: {
                        a: { song_id: 'sa', snip },
                        b: track('b', { blocked: true, blocked_at: 5 }),
                        c: track('c', { liked: true }),
                        d: 'junk'
                    }
                })
            )
        )
        expect(parsed.data.chorus_collection).toEqual({
            a: { song_id: 'sa', track_id: 'a', snip },
            b: track('b', { blocked: true, blocked_at: 5 })
        })
    })

    it('treats a damaged library as fatal', () => {
        expect(() => parseBackup(JSON.stringify(file({ chorus_collection: [] })))).toThrow(
            'damaged'
        )
    })

    it('fills in a missing version and date', () => {
        const parsed = parseBackup('{"app":"chorus","data":{}}')
        expect(parsed.version).toBe('unknown')
        expect(parsed.exported_at).toBe('')
        expect(parsed.format).toBe(0)
    })
})

describe('summarizeBackup / describeSummary', () => {
    const data = {
        chorus_collection: {
            a: track('a', { snip }),
            b: track('b', { snip, blocked: true }),
            c: track('c', { blocked: true }),
            d: track('d', { playback: { rate: { value: 1.2, preserves_pitch: true } } })
        },
        chorus_user_eq_presets: { Warm: [], Bright: [] },
        chorus_user_reverb_presets: { Attic: {} },
        chorus_config: { audio_presets: [mine('1', 'Study')] },
        chorus_settings: {}
    }

    it('counts what the file holds', () => {
        expect(summarizeBackup(data)).toEqual({
            snips: 2,
            blocked: 2,
            speeds: 1,
            eq_presets: 2,
            reverb_presets: 1,
            mine_presets: 1,
            settings: true
        })
    })

    it('reads as a list of what is there', () => {
        expect(describeSummary(summarizeBackup(data))).toBe(
            '2 snips · 2 blocked tracks · 1 track speed · 2 EQ presets · 1 reverb preset · 1 Mine preset · settings'
        )
        expect(describeSummary(summarizeBackup({}))).toBe('an empty library')
    })
})

describe('mergeCollections', () => {
    it('unions tracks and, per track, lets the file win field by field', () => {
        const merged = mergeCollections(
            { a: track('a', { blocked: true, blocked_at: 1 }), b: track('b', { snip }) },
            { a: track('a', { snip }), c: track('c', { blocked: true }) }
        )
        expect(merged.a).toEqual(track('a', { blocked: true, blocked_at: 1, snip }))
        expect(merged.b).toEqual(track('b', { snip }))
        expect(merged.c).toEqual(track('c', { blocked: true }))
    })
})

describe('mergeMinePresets', () => {
    it('adds new presets into free slots, skipping same id or name, up to five', () => {
        const current = [mine('1', 'Study'), mine('2', 'Night')]
        const incoming = [
            mine('1', 'Study copy'),
            mine('9', 'Night'),
            mine('3', 'Car'),
            mine('4', 'Run'),
            mine('5', 'Sleep'),
            mine('6', 'Extra')
        ]
        const slots = mergeMinePresets(current, incoming)
        expect(slots.map((s) => s.name)).toEqual(['Study', 'Night', 'Car', 'Run', 'Sleep'])
    })

    it('returns the same array when nothing is added', () => {
        const current = [mine('1', 'Study')]
        expect(mergeMinePresets(current, [mine('1', 'Study')])).toBe(current)
    })
})

describe('applyBackup', () => {
    it('replace writes every key the file carries and nothing else', async () => {
        const store = memoryStore({ chorus_seek: { kept: true }, chorus_settings: { old: true } })
        const summary = await applyBackup(
            file({
                chorus_collection: { a: track('a', { snip }) },
                chorus_settings: { ui: { pip: true } }
            }),
            'replace',
            store
        )
        expect(store.data.get('chorus_settings')).toEqual({ ui: { pip: true } })
        expect(store.data.get('chorus_collection')).toEqual({ a: track('a', { snip }) })
        expect(store.data.get('chorus_seek')).toEqual({ kept: true })
        expect(summary.settings).toBe(true)
        expect(summary.snips).toBe(1)
    })

    it('replace writes keys in the declared order', async () => {
        const order: string[] = []
        const store = memoryStore()
        store.set = async (key) => {
            order.push(key)
        }
        const data = Object.fromEntries([...BACKUP_KEYS].reverse().map((key) => [key, {}]))
        await applyBackup(file(data), 'replace', store)
        expect(order).toEqual([...BACKUP_KEYS])
    })

    it('brings old-mix reverb values up to the current mix and stamps the version', async () => {
        const store = memoryStore()
        await applyBackup(
            file({
                chorus_user_reverb_presets: { Attic: { dry: 1, wet: 0.5 } },
                chorus_reverb_params: { dry: 1, wet: 0.8 }
            }),
            'replace',
            store
        )
        expect(store.data.get('chorus_user_reverb_presets')).toEqual({
            Attic: { dry: 1, wet: 0.25 }
        })
        expect(store.data.get('chorus_user_reverb_presets_version')).toBe(REVERB_MIX_VERSION)
        expect(store.data.get('chorus_reverb_params')).toEqual({ dry: 1, wet: 0.4 })
        expect(store.data.get('chorus_reverb_params_version')).toBe(REVERB_MIX_VERSION)
    })

    it('leaves current-mix reverb values alone', async () => {
        const store = memoryStore()
        await applyBackup(
            file({
                chorus_user_reverb_presets: { Attic: { dry: 1, wet: 0.25 } },
                chorus_user_reverb_presets_version: REVERB_MIX_VERSION
            }),
            'replace',
            store
        )
        expect(store.data.get('chorus_user_reverb_presets')).toEqual({
            Attic: { dry: 1, wet: 0.25 }
        })
    })

    it('add folds the library and presets into what is there and keeps settings', async () => {
        const store = memoryStore({
            chorus_collection: { a: track('a', { blocked: true }) },
            chorus_settings: { mine: true },
            chorus_user_eq_presets: { Warm: [1] },
            chorus_config: { audio_presets: [mine('1', 'Study')], auto_skip: { enabled: true } }
        })
        const summary = await applyBackup(
            file({
                chorus_collection: { b: track('b', { snip }) },
                chorus_settings: { theirs: true },
                chorus_user_eq_presets: { Warm: [2], Bright: [3] },
                chorus_user_reverb_presets: { Attic: { dry: 1, wet: 0.5 } },
                chorus_config: {
                    audio_presets: [mine('2', 'Night')],
                    auto_skip: { enabled: false }
                }
            }),
            'add',
            store
        )
        expect(store.data.get('chorus_collection')).toEqual({
            a: track('a', { blocked: true }),
            b: track('b', { snip })
        })
        expect(store.data.get('chorus_settings')).toEqual({ mine: true })
        expect(store.data.get('chorus_user_eq_presets')).toEqual({ Warm: [2], Bright: [3] })
        expect(store.data.get('chorus_user_reverb_presets')).toEqual({
            Attic: { dry: 1, wet: 0.25 }
        })
        expect(store.data.get('chorus_user_reverb_presets_version')).toBe(REVERB_MIX_VERSION)
        expect(store.data.get('chorus_config')).toEqual({
            audio_presets: [mine('1', 'Study'), mine('2', 'Night')],
            auto_skip: { enabled: true }
        })
        expect(summary.settings).toBe(false)
        expect(summary.snips).toBe(1)
    })
})
