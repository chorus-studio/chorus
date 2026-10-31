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
    mergeLooks,
    mergeMinePresets,
    parseBackup,
    summarizeBackup,
    type Backup,
    type BackupKey,
    type BackupStorage
} from './backup'
import { REVERB_MIX_VERSION } from '$lib/stores/reverb-params'
import type { AudioPreset } from '$lib/stores/config'
import type { LooksState } from '$lib/types/look'

function memoryStore(initial: Partial<Record<BackupKey | string, unknown>> = {}) {
    const data = new Map<string, unknown>(Object.entries(initial))
    const store: BackupStorage & { data: Map<string, unknown> } = {
        data,
        get: async <T>(key: string) => (data.has(key) ? (data.get(key) as T) : null),
        set: async (key: string, value: unknown) => {
            data.set(key, value)
        },
        remove: async (key: string) => {
            data.delete(key)
        }
    }
    return store
}

const pixel = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
const picture = { mime: 'image/webp', data: pixel, width: 1, height: 1, bytes: 34, animated: false }
const look = (id: string, name: string, wallpaper?: string) => ({
    id,
    name,
    palette: { kind: 'colours', base: '#10263a', accent: '#ffb36b' },
    backdrop: wallpaper
        ? {
              kind: 'image',
              source: { type: 'file', id: wallpaper },
              fit: 'cover',
              anchor: 'center',
              dim: 35,
              blur: 0,
              saturate: 100,
              tint: true,
              animate: true
          }
        : null,
    panels: { showThrough: 25, glass: false },
    createdAt: 1,
    updatedAt: 1
})
const looksState = (...looks: ReturnType<typeof look>[]): LooksState =>
    ({
        version: 1,
        looks: Object.fromEntries(looks.map((l) => [l.id, l])),
        hiddenBuiltIn: []
    }) as unknown as LooksState

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

    it('carries the pictures the saved looks keep, and no other', async () => {
        const store = memoryStore({
            chorus_looks: looksState(look('a', 'Beach', 'a.w1'), look('b', 'Plain')),
            chorus_wallpaper_a_w1: picture,
            'chorus_wallpaper_a.w1': picture,
            'chorus_wallpaper_old.w0': picture
        })
        const backup = await createBackup('2.11.0', store)
        expect(Object.keys(backup.wallpapers ?? {})).toEqual(['a.w1'])
        expect(backup.wallpapers?.['a.w1']).toEqual(picture)
        const plain = await createBackup(
            '2.11.0',
            memoryStore({ chorus_looks: looksState(look('b', 'Plain')) })
        )
        expect(plain.wallpapers).toBeUndefined()
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

    it('checks every look and keeps only the pictures the looks name', () => {
        const parsed = parseBackup(
            JSON.stringify({
                ...file({
                    chorus_looks: {
                        looks: {
                            a: look('a', 'Beach', 'a.w1'),
                            b: {
                                ...look('b', 'Odd'),
                                panels: { showThrough: 500, glass: 'x' },
                                palette: 'nope'
                            },
                            c: { id: 'c' }
                        },
                        hiddenBuiltIn: ['regal', 7]
                    }
                }),
                wallpapers: {
                    'a.w1': picture,
                    stray: picture,
                    bad: { mime: 'image/png', data: '%%%' }
                }
            })
        )
        const looks = parsed.data.chorus_looks as {
            looks: Record<string, unknown>
            hiddenBuiltIn: string[]
        }
        expect(Object.keys(looks.looks)).toEqual(['a', 'b'])
        expect(looks.looks.b).toMatchObject({
            panels: { showThrough: 100, glass: false },
            palette: { kind: 'builtin', name: 'spotify' }
        })
        expect(looks.hiddenBuiltIn).toEqual(['regal'])
        expect(Object.keys(parsed.wallpapers ?? {})).toEqual(['a.w1'])
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
        chorus_looks: looksState(look('a', 'Beach', 'a.w1'), look('b', 'Plain')),
        chorus_settings: {}
    }

    it('counts what the file holds', () => {
        expect(summarizeBackup(data, { 'a.w1': { ...picture, bytes: 2048 } })).toEqual({
            snips: 2,
            blocked: 2,
            speeds: 1,
            eq_presets: 2,
            reverb_presets: 1,
            mine_presets: 1,
            looks: 2,
            picture_bytes: 2048,
            settings: true
        })
    })

    it('reads as a list of what is there', () => {
        expect(describeSummary(summarizeBackup(data))).toBe(
            '2 snips · 2 blocked tracks · 1 track speed · 2 EQ presets · 1 reverb preset · 1 Mine preset · 2 looks · settings'
        )
        expect(describeSummary(summarizeBackup({}))).toBe('an empty library')
    })
})

describe('mergeLooks', () => {
    it('adds looks new by id, renaming a taken name, and leaves the hidden list alone', () => {
        const current = {
            ...looksState(look('a', 'Beach'), look('b', 'Plain')),
            hiddenBuiltIn: ['regal']
        }
        const merged = mergeLooks(
            current,
            looksState({ ...look('a', 'Beach renamed') }, look('c', 'plain'), look('d', 'Dusk'))
        )
        expect(Object.keys(merged.looks)).toEqual(['a', 'b', 'c', 'd'])
        expect(merged.looks.a.name).toBe('Beach')
        expect(merged.looks.c.name).toBe('plain 2')
        expect(merged.looks.d.name).toBe('Dusk')
        expect(merged.hiddenBuiltIn).toEqual(['regal'])
        expect(mergeLooks(current, looksState(look('a', 'Beach')))).toBe(current)
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

    it('replace swaps the looks and their pictures, dropping pictures no look names any more', async () => {
        const store = memoryStore({
            chorus_looks: looksState(look('old', 'Old', 'old.w0'), look('same', 'Same', 'same.w1')),
            'chorus_wallpaper_old.w0': picture,
            'chorus_wallpaper_same.w1': { ...picture, bytes: 1 }
        })
        const summary = await applyBackup(
            {
                ...file({
                    chorus_looks: looksState(
                        look('same', 'Same', 'same.w1'),
                        look('new', 'New', 'new.w2')
                    )
                }),
                wallpapers: { 'new.w2': picture }
            },
            'replace',
            store
        )
        expect(Object.keys((store.data.get('chorus_looks') as { looks: object }).looks)).toEqual([
            'same',
            'new'
        ])
        expect(store.data.has('chorus_wallpaper_old.w0')).toBe(false)
        // The file had no bytes for this one; what is there stays.
        expect(store.data.get('chorus_wallpaper_same.w1')).toEqual({ ...picture, bytes: 1 })
        expect(store.data.get('chorus_wallpaper_new.w2')).toEqual(picture)
        expect(summary.looks).toBe(2)
        expect(summary.picture_bytes).toBe(34)
    })

    it('replace without looks in the file leaves looks and pictures alone', async () => {
        const store = memoryStore({
            chorus_looks: looksState(look('old', 'Old', 'old.w0')),
            'chorus_wallpaper_old.w0': picture
        })
        await applyBackup(file({ chorus_settings: {} }), 'replace', store)
        expect(store.data.get('chorus_looks')).toEqual(looksState(look('old', 'Old', 'old.w0')))
        expect(store.data.get('chorus_wallpaper_old.w0')).toEqual(picture)
    })

    it('add brings in new looks with their pictures and skips ones already there', async () => {
        const store = memoryStore({
            chorus_looks: { ...looksState(look('a', 'Beach', 'a.w1')), hiddenBuiltIn: ['regal'] },
            'chorus_wallpaper_a.w1': { ...picture, bytes: 1 }
        })
        const summary = await applyBackup(
            {
                ...file({
                    chorus_looks: {
                        ...looksState(look('a', 'Beach', 'a.w9'), look('b', 'Beach', 'b.w1')),
                        hiddenBuiltIn: ['lava']
                    }
                }),
                wallpapers: { 'a.w9': picture, 'b.w1': picture }
            },
            'add',
            store
        )
        const looks = store.data.get('chorus_looks') as {
            looks: Record<string, { name: string }>
            hiddenBuiltIn: string[]
        }
        expect(Object.keys(looks.looks)).toEqual(['a', 'b'])
        expect(looks.looks.b.name).toBe('Beach 2')
        expect(looks.hiddenBuiltIn).toEqual(['regal'])
        expect(store.data.get('chorus_wallpaper_a.w1')).toEqual({ ...picture, bytes: 1 })
        expect(store.data.has('chorus_wallpaper_a.w9')).toBe(false)
        expect(store.data.get('chorus_wallpaper_b.w1')).toEqual(picture)
        expect(summary.looks).toBe(2)
    })
})
