// Built-in quick presets: named combinations of rate, pitch, key, reverb, EQ and
// stereo that apply in one tap from the Presets tab. Every value here is a preset
// name the engine already knows (reverb/presets.ts, equalizer/presets.ts,
// ms-processor/presets.ts), so this module is pure data plus a few comparisons
// the background script and the UI both rely on.
import { defaultPlayback, type Playback } from '$lib/stores/playback'
import { defaultAudioEffect, type AudioEffect } from '$lib/stores/effects'
import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'

export type PresetValues = { playback: Playback; effect: AudioEffect }

/**
 * Window message the background posts into the Spotify page for the keyboard
 * commands (next / previous quick preset, preset slot N); the page applies it.
 */
export const QUICK_PRESET_EVENT = 'FROM_QUICK_PRESET_LISTENER'
export type QuickPresetMessage = { values: PresetValues; name: string | null }

export type QuickPresetGroup = 'vibes' | 'texture' | 'tools'

export type QuickPreset = PresetValues & {
    id: string
    name: string
    group: QuickPresetGroup
    /** Lucide icon key; the Presets view maps it to a component. */
    icon: string
}

export const QUICK_PRESET_GROUPS: { id: QuickPresetGroup; label: string }[] = [
    { id: 'vibes', label: 'Vibes' },
    { id: 'texture', label: 'Texture' },
    { id: 'tools', label: 'Tools' }
]

/** Everything off: the state "Normal" returns to and the one a saved slot must differ from. */
export const NORMAL_VALUES: PresetValues = {
    playback: defaultPlayback,
    effect: defaultAudioEffect
}

type PlaybackOpts = { rate?: number; keepPitch?: boolean; pitch?: number; semitone?: number }

/** Playback with the defaults filled in; `keepPitch: false` lets pitch follow the rate. */
const pb = ({ rate = 1, keepPitch = true, pitch = 1, semitone = 0 }: PlaybackOpts): Playback => ({
    rate: { value: rate, preserves_pitch: keepPitch },
    pitch,
    semitone
})

const fx = (effect: Partial<AudioEffect>): AudioEffect => ({ ...defaultAudioEffect, ...effect })

export const QUICK_PRESETS: QuickPreset[] = [
    // Vibes: the internet's tempo and pitch edits.
    {
        id: 'nightcore',
        name: 'Nightcore',
        group: 'vibes',
        icon: 'moon',
        playback: pb({ rate: 1.25, keepPitch: false }),
        effect: fx({})
    },
    {
        id: 'sped-up',
        name: 'Sped up',
        group: 'vibes',
        icon: 'fast-forward',
        playback: pb({ rate: 1.12, keepPitch: false }),
        effect: fx({ reverb: 'small' })
    },
    {
        id: 'slowed-reverb',
        name: 'Slowed + reverb',
        group: 'vibes',
        icon: 'rewind',
        playback: pb({ rate: 0.85, keepPitch: false }),
        effect: fx({ reverb: 'hall' })
    },
    {
        id: 'daycore',
        name: 'Daycore',
        group: 'vibes',
        icon: 'sun',
        playback: pb({ rate: 0.8, keepPitch: false }),
        effect: fx({})
    },
    {
        id: 'chipmunk',
        name: 'Chipmunk',
        group: 'vibes',
        icon: 'chevrons-up',
        playback: pb({ semitone: 9 }),
        effect: fx({})
    },
    {
        id: 'demon',
        name: 'Demon',
        group: 'vibes',
        icon: 'chevrons-down',
        playback: pb({ semitone: -7 }),
        effect: fx({ reverb: 'basement' })
    },

    // Texture: the song stays as it is; the room and the medium change.
    {
        id: 'lofi',
        name: 'Lo-fi',
        group: 'texture',
        icon: 'cassette-tape',
        playback: pb({ rate: 0.97, keepPitch: false }),
        effect: fx({ reverb: 'lofi', equalizer: 'Lo-Fi Hip Hop', msProcessor: 'narrow' })
    },
    {
        id: 'vintage-radio',
        name: 'Vintage radio',
        group: 'texture',
        icon: 'radio',
        playback: pb({}),
        effect: fx({ reverb: 'radio', equalizer: 'Vintage Radio' })
    },
    {
        id: 'another-room',
        name: 'Another room',
        group: 'texture',
        icon: 'door-closed',
        playback: pb({}),
        effect: fx({ reverb: 'muffler', equalizer: 'Treble reducer' })
    },
    {
        id: 'underwater',
        name: 'Underwater',
        group: 'texture',
        icon: 'waves',
        playback: pb({}),
        effect: fx({ reverb: 'underwater', equalizer: 'Treble reducer' })
    },
    {
        id: 'telephone',
        name: 'Telephone',
        group: 'texture',
        icon: 'phone',
        playback: pb({}),
        effect: fx({ reverb: 'telephone_ir' })
    },
    {
        id: 'live-show',
        name: 'Live show',
        group: 'texture',
        icon: 'speaker',
        playback: pb({}),
        effect: fx({ reverb: 'arena', equalizer: 'Live', msProcessor: 'wide' })
    },

    // Tools: listening and practice helpers.
    {
        id: 'bass-boost',
        name: 'Bass boost',
        group: 'tools',
        icon: 'audio-lines',
        playback: pb({}),
        effect: fx({ equalizer: 'Bass booster' })
    },
    {
        id: 'podcast',
        name: 'Podcast',
        group: 'tools',
        icon: 'podcast',
        playback: pb({ rate: 1.5 }),
        effect: fx({ equalizer: 'Spoken word' })
    },
    {
        id: 'karaoke',
        name: 'Karaoke',
        group: 'tools',
        icon: 'mic-off',
        playback: pb({}),
        effect: fx({ msProcessor: 'karaoke' })
    },
    {
        id: 'sing-along',
        name: 'Sing-along',
        group: 'tools',
        icon: 'mic',
        playback: pb({}),
        effect: fx({ equalizer: 'Vocal booster', msProcessor: 'vocal-focus' })
    },
    {
        id: 'practice',
        name: 'Practice',
        group: 'tools',
        icon: 'music',
        playback: pb({ rate: 0.75 }),
        effect: fx({})
    },
    {
        id: 'mono',
        name: 'Mono',
        group: 'tools',
        icon: 'headphones',
        playback: pb({}),
        effect: fx({ msProcessor: 'mono' })
    }
]

export const quickPresetIds = QUICK_PRESETS.map((p) => p.id)
export const quickPresetById = (id: string) => QUICK_PRESETS.find((p) => p.id === id)

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6

/**
 * Whether two states sound the same. Pitch preservation only matters once the
 * rate moves, and a reverb name is compared through its alias so a preset saved
 * under a retired name still matches its twin.
 */
export function sameValues(a: PresetValues, b: PresetValues): boolean {
    const ra = a.playback.rate
    const rb = b.playback.rate
    if (!close(ra.value, rb.value)) return false
    if (!close(ra.value, 1) && Boolean(ra.preserves_pitch) !== Boolean(rb.preserves_pitch))
        return false
    if (!close(a.playback.pitch, b.playback.pitch)) return false
    if (a.playback.semitone !== b.playback.semitone) return false
    if (resolveReverbPreset(a.effect.reverb) !== resolveReverbPreset(b.effect.reverb)) return false
    if (a.effect.equalizer !== b.effect.equalizer) return false
    return a.effect.msProcessor === b.effect.msProcessor
}

export const isNormal = (values: PresetValues) => sameValues(values, NORMAL_VALUES)

/** The id of the first candidate whose values match, or null when nothing does. */
export function matchPreset<T extends PresetValues & { id: string }>(
    values: PresetValues,
    candidates: T[]
): T | null {
    return candidates.find((candidate) => sameValues(values, candidate)) ?? null
}

/**
 * A short, honest description of what a preset does: only the knobs that moved.
 * "1.25×", "+9 st", "hall", "Live EQ", "wide". A changed rate lets the pitch
 * follow unless it says "keep pitch", the way sped-up and slowed edits work.
 */
export function recipe({ playback, effect }: PresetValues): string[] {
    const out: string[] = []
    const { rate, pitch, semitone } = playback
    if (!close(rate.value, 1)) {
        out.push(`${trim(rate.value)}×`)
        if (rate.preserves_pitch) out.push('keep pitch')
    }
    if (!close(pitch, 1)) out.push(`pitch ${trim(pitch)}`)
    if (semitone !== 0) out.push(`${semitone > 0 ? '+' : ''}${semitone} st`)
    const reverb = resolveReverbPreset(effect.reverb)
    if (reverb && reverb !== 'none') out.push(reverb.replace(/_ir$/, ' IR'))
    if (effect.equalizer && effect.equalizer !== 'none') out.push(`${effect.equalizer} EQ`)
    if (effect.msProcessor && effect.msProcessor !== 'none') out.push(effect.msProcessor)
    return out
}

const trim = (n: number) => String(Number(n.toFixed(3)))
