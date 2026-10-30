import { describe, expect, it, vi } from 'vitest'

vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))

// The watcher half of the module reaches the now-playing store and the apply
// path, neither of which runs here; the decision function is what is tested.
vi.mock('$lib/stores/now-playing', () => ({ nowPlaying: { subscribe: () => () => {} } }))
vi.mock('$lib/stores/config', () => ({ configStore: { subscribe: () => () => {} } }))
vi.mock('$lib/utils/quick-presets', () => ({
    applyNormal: vi.fn(),
    applyPresetValues: vi.fn(),
    currentValues: vi.fn(),
    lastApplied: { subscribe: () => () => {} },
    presetById: vi.fn()
}))

import { NORMAL_VALUES, QUICK_PRESETS, type PresetValues } from '$lib/audio-effects/quick-presets'
import { artistKeyFromHref, decideBinding, type ActiveBinding } from './preset-bindings'
import type { PresetBinding } from '$lib/stores/preset-bindings'

const lofi = QUICK_PRESETS.find((p) => p.id === 'classic-lofi') ?? QUICK_PRESETS[0]
const nightcore = QUICK_PRESETS.find((p) => p.id === 'nightcore') ?? QUICK_PRESETS[1]
const values = (p: typeof lofi): PresetValues => ({
    playback: p.playback,
    effect: p.effect,
    lofi: p.lofi
})
const binding: PresetBinding = {
    key: 'artist:m83',
    name: 'M83',
    preset_id: lofi.id,
    preset_name: lofi.name
}
const resolve = (id: string) => {
    const p = QUICK_PRESETS.find((q) => q.id === id)
    return p ? values(p) : null
}

describe('artistKeyFromHref', () => {
    it('reads the artist id from an artist link only', () => {
        expect(artistKeyFromHref('/artist/63MtD7ThdiiTmkE0FK5mwz', ' M83 ')).toEqual({
            key: 'artist:63MtD7ThdiiTmkE0FK5mwz',
            id: '63MtD7ThdiiTmkE0FK5mwz',
            name: 'M83'
        })
        expect(artistKeyFromHref('https://open.spotify.com/artist/abc123?si=x', 'A')?.key).toBe(
            'artist:abc123'
        )
        expect(artistKeyFromHref('/track/abc', 'A')).toBeNull()
    })
})

describe('decideBinding', () => {
    const base = {
        keys: ['artist:m83'],
        resolve,
        origin: null as string | null,
        active: null as ActiveBinding | null
    }

    it('does nothing without a binding or when the binding is already active', () => {
        expect(decideBinding({ ...base, binding: null, current: NORMAL_VALUES })).toEqual({
            type: 'none'
        })
        const active: ActiveBinding = {
            key: 'artist:m83',
            applied: values(lofi),
            before: null,
            beforeOrigin: null
        }
        expect(decideBinding({ ...base, binding, current: values(lofi), active })).toEqual({
            type: 'none'
        })
    })

    it('applies a binding and remembers what played before', () => {
        const d = decideBinding({
            ...base,
            binding,
            current: values(nightcore),
            origin: nightcore.id
        })
        expect(d.type).toBe('apply')
        if (d.type !== 'apply') return
        expect(d.values).toEqual(values(lofi))
        expect(d.next.before).toEqual(values(nightcore))
        expect(d.next.beforeOrigin).toBe(nightcore.id)
    })

    it('remembers nothing to restore when the preset already played', () => {
        const d = decideBinding({ ...base, binding, current: values(lofi), origin: lofi.id })
        if (d.type !== 'apply') throw new Error(d.type)
        expect(d.next.before).toBeNull()
    })

    it('brings the earlier sound back after the artist, unless the person changed it', () => {
        const active: ActiveBinding = {
            key: 'artist:m83',
            applied: values(lofi),
            before: values(nightcore),
            beforeOrigin: nightcore.id
        }
        expect(decideBinding({ ...base, binding: null, current: values(lofi), active })).toEqual({
            type: 'restore',
            values: values(nightcore),
            origin: nightcore.id
        })
        expect(decideBinding({ ...base, binding: null, current: NORMAL_VALUES, active })).toEqual({
            type: 'release'
        })
        const fresh: ActiveBinding = { ...active, before: null, beforeOrigin: null }
        expect(
            decideBinding({ ...base, binding: null, current: values(lofi), active: fresh })
        ).toEqual({ type: 'restore', values: null, origin: null })
    })

    it('switching straight to another bound artist keeps the original "before"', () => {
        const active: ActiveBinding = {
            key: 'artist:m83',
            applied: values(lofi),
            before: values(nightcore),
            beforeOrigin: nightcore.id
        }
        const other: PresetBinding = {
            key: 'artist:other',
            name: 'Other',
            preset_id: nightcore.id,
            preset_name: nightcore.name
        }
        const d = decideBinding({
            ...base,
            keys: ['artist:other'],
            binding: other,
            current: values(lofi),
            active
        })
        if (d.type !== 'apply') throw new Error(d.type)
        expect(d.next.before).toEqual(values(nightcore))
    })

    it('ignores a binding whose preset no longer exists', () => {
        const gone: PresetBinding = { ...binding, preset_id: 'missing' }
        expect(decideBinding({ ...base, binding: gone, current: NORMAL_VALUES })).toEqual({
            type: 'none'
        })
    })
})
