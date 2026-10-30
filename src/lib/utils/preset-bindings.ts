import { get } from 'svelte/store'
import { nowPlaying } from '$lib/stores/now-playing'
import { configStore } from '$lib/stores/config'
import { presetBindingsStore, type PresetBinding } from '$lib/stores/preset-bindings'
import { sameValues, type PresetValues } from '$lib/audio-effects/quick-presets'
import {
    applyNormal,
    applyPresetValues,
    currentValues,
    lastApplied,
    presetById
} from '$lib/utils/quick-presets'

/** An artist on the playing track, from the now-playing bar's links. */
export type BarArtist = { key: string; id: string; name: string }

/** "artist:<id>" from an /artist/<id> link; null for any other href. */
export function artistKeyFromHref(href: string, name = ''): BarArtist | null {
    const match = /\/artist\/([A-Za-z0-9]+)/.exec(href)
    if (!match) return null
    return { key: `artist:${match[1]}`, id: match[1], name: name.trim() }
}

/** The artists the now-playing bar links to, in order. */
export function artistsFromBar(root: ParentNode = document): BarArtist[] {
    const seen = new Set<string>()
    const out: BarArtist[] = []
    const anchors = root.querySelectorAll<HTMLAnchorElement>(
        '[data-testid="now-playing-widget-v2"] a[href*="/artist/"]'
    )
    for (const anchor of anchors) {
        const artist = artistKeyFromHref(
            anchor.getAttribute('href') ?? '',
            anchor.textContent ?? ''
        )
        if (artist && !seen.has(artist.key)) {
            seen.add(artist.key)
            out.push(artist)
        }
    }
    return out
}

/** What a binding put in place, and what to bring back when its artist is done. */
export type ActiveBinding = {
    key: string
    applied: PresetValues
    before: PresetValues | null
    beforeOrigin: string | null
}

export type BindingDecision =
    | { type: 'none' }
    | { type: 'apply'; binding: PresetBinding; values: PresetValues; next: ActiveBinding }
    | { type: 'restore'; values: PresetValues | null; origin: string | null }
    | { type: 'release' }

/**
 * Decide what a track change means for the bindings. Pure, so it is tested:
 * a matching binding applies once (remembering what played before, unless
 * that already was the preset); the same binding on the next track does
 * nothing; leaving the artist brings the earlier sound back, unless the person
 * changed the sound meanwhile, in which case their choice stands.
 */
export function decideBinding(args: {
    keys: string[]
    binding: PresetBinding | null
    resolve: (preset_id: string) => PresetValues | null
    current: PresetValues
    origin: string | null
    active: ActiveBinding | null
}): BindingDecision {
    const { binding, resolve, current, origin, active } = args
    if (binding) {
        if (active?.key === binding.key) return { type: 'none' }
        const values = resolve(binding.preset_id)
        if (!values) return { type: 'none' }
        const alreadyPlaying = sameValues(current, values)
        const next: ActiveBinding = {
            key: binding.key,
            applied: values,
            before: active ? active.before : alreadyPlaying ? null : current,
            beforeOrigin: active ? active.beforeOrigin : alreadyPlaying ? null : origin
        }
        return { type: 'apply', binding, values, next }
    }
    if (!active) return { type: 'none' }
    if (!sameValues(current, active.applied)) return { type: 'release' }
    return { type: 'restore', values: active.before, origin: active.beforeOrigin }
}

/** Follow the playing track: apply the artist's preset, and undo it after. Returns the unsubscribe. */
export function watchPresetBindings(): () => void {
    let active: ActiveBinding | null = null
    let lastTrack: string | null = null

    async function run() {
        const keys = artistsFromBar().map((a) => a.key)
        const binding = presetBindingsStore.bindingFor(keys)
        const mine = get(configStore).audio_presets
        const decision = decideBinding({
            keys,
            binding,
            resolve: (id) => presetById(id, mine),
            current: currentValues(),
            origin: get(lastApplied),
            active
        })
        if (decision.type === 'apply') {
            active = decision.next
            await applyPresetValues(decision.values, decision.binding.preset_id)
        } else if (decision.type === 'restore') {
            active = null
            if (decision.values) await applyPresetValues(decision.values, decision.origin)
            else await applyNormal()
        } else if (decision.type === 'release') {
            active = null
        }
    }

    const unsubscribe = nowPlaying.subscribe((state) => {
        if (!state.track_id || state.track_id === lastTrack) return
        lastTrack = state.track_id
        // The bar's links settle a beat after the store does.
        setTimeout(() => void run(), 150)
    })
    // A binding made or removed for the playing artist takes effect at once.
    const unsubscribeBindings = presetBindingsStore.subscribe(() => {
        if (lastTrack) void run()
    })
    return () => {
        unsubscribe()
        unsubscribeBindings()
    }
}
