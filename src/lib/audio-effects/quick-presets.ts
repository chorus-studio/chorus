// Built-in quick presets: named combinations of rate, pitch, key, the Chorus
// reverb / EQ / stereo slots and the lovelofi effect rack, applied in one tap
// from the Presets tab. This module is data plus the comparisons the background
// script and the UI both rely on. The lovelofi presets come straight from the
// vendored catalogue (lofi/constants.ts); only their slowdown is translated,
// into a playback rate, because Chorus slows the element itself.
import { defaultPlayback, type Playback } from '$lib/stores/playback'
import { defaultAudioEffect, type AudioEffect } from '$lib/stores/effects'
import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'
import {
    DEFAULT_EFFECT_SETTINGS,
    DEFAULT_EQUALIZER_BANDS,
    normalizeEffectSettings,
    type EffectSettings,
    type EffectSettingsInput,
    type EqualizerSettings
} from '$lib/audio-effects/lofi/audio/effect-settings'
import { DEFAULT_REVERB_PROFILE } from '$lib/audio-effects/lofi/audio/effects/reverb'
import type { Preset as LovelofiPreset } from '$lib/audio-effects/lofi/constants'
import {
    getBuiltInPresetSections,
    type PresetSectionId
} from '$lib/audio-effects/lofi/preset-library'

export type PresetValues = { playback: Playback; effect: AudioEffect; lofi: EffectSettings }

/**
 * Window message the background posts into the Spotify page for the keyboard
 * commands (next / previous quick preset, preset slot N); the page applies it.
 */
export const QUICK_PRESET_EVENT = 'FROM_QUICK_PRESET_LISTENER'
export type QuickPresetMessage = { values: PresetValues; name: string | null }

export type QuickPresetGroup = 'vibes' | 'lofi' | 'spaces' | 'tools'

export type QuickPreset = PresetValues & {
    id: string
    name: string
    description: string
    group: QuickPresetGroup
    /** Sub-heading within the group, for the long Lo-fi list. */
    section?: string
    /** Lucide icon key; the Presets view maps it to a component. */
    icon: string
}

export const QUICK_PRESET_GROUPS: { id: QuickPresetGroup; label: string }[] = [
    { id: 'vibes', label: 'Vibes' },
    { id: 'lofi', label: 'Lo-fi' },
    { id: 'spaces', label: 'Spaces' },
    { id: 'tools', label: 'Tools' }
]

/** Everything off: the state "Normal" returns to and the one a saved slot must differ from. */
export const NORMAL_VALUES: PresetValues = {
    playback: defaultPlayback,
    effect: defaultAudioEffect,
    lofi: DEFAULT_EFFECT_SETTINGS
}

type PlaybackOpts = { rate?: number; keepPitch?: boolean; pitch?: number; semitone?: number }

/** Playback with the defaults filled in; `keepPitch: false` lets pitch follow the rate. */
const pb = ({ rate = 1, keepPitch = true, pitch = 1, semitone = 0 }: PlaybackOpts): Playback => ({
    rate: { value: rate, preserves_pitch: keepPitch },
    pitch,
    semitone
})

const fx = (effect: Partial<AudioEffect>): AudioEffect => ({ ...defaultAudioEffect, ...effect })

/** lovelofi settings with every effect off except the ones named. */
const lo = (settings: EffectSettingsInput = {}): EffectSettings => normalizeEffectSettings(settings)

/**
 * The rack's five-band EQ (90 Hz, 250 Hz, 1 kHz, 3.5 kHz, 9 kHz) from five
 * gains in dB. It reaches ±12 dB, which is why the Tools use it: the Chorus EQ
 * presets stay within a couple of dB and are easy to miss.
 */
const eq = (gains: [number, number, number, number, number]): EqualizerSettings => ({
    enabled: true,
    bands: DEFAULT_EQUALIZER_BANDS.map((band, i) => ({ ...band, gain: gains[i] }))
})

/**
 * lovelofi's slowdown re-reads a buffer at 1 − intensity/200 (100 = half speed,
 * an octave down). Chorus slows the element by the same amount with the pitch
 * following, which sounds the same and never has to skip ahead.
 */
export const slowdownRate = (intensity: number) => 1 - Math.max(0, Math.min(100, intensity)) / 200

/** lovelofi names are Title Case; Chorus labels are sentence case. Acronyms stay. */
export function sentence(text: string): string {
    return text
        .split(' ')
        .map((word, i) => {
            if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word
            const lower = word.toLowerCase()
            return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
        })
        .join(' ')
}

const LOVELOFI_ICONS: Record<string, string> = {
    'lofi-cover': 'album',
    'classic-lofi': 'disc',
    'late-night-study': 'lamp-desk',
    'rainy-cafe': 'cloud-rain',
    dreamy: 'cloud-moon',
    'old-cassette': 'cassette-tape',
    'hotel-lobby': 'hotel',
    'haunted-ballroom': 'ghost',
    'vintage-radio': 'radio',
    'lofi-hiphop': 'headphones',
    'lofi-jazz': 'music-2',
    'lofi-chill': 'coffee',
    'lofi-synthwave': 'zap',
    'lofi-vaporwave': 'cloud',
    'sunday-morning': 'sunrise',
    'next-door': 'door-closed',
    'pillow-fort': 'bed',
    'broken-walkman': 'battery-low',
    'vhs-memories': 'tv',
    'foggy-harbor': 'cloud-fog',
    'empty-apartment': 'house',
    'basement-show': 'guitar',
    'parking-garage': 'car',
    'bathroom-tiles': 'bath',
    'church-hall': 'church',
    'upstairs-party': 'party-popper',
    underwater: 'waves',
    '8-bit-chill': 'gamepad-2'
}

/** Which Chorus group each lovelofi section lands in. */
const LOVELOFI_GROUPS: Record<PresetSectionId, QuickPresetGroup> = {
    featured: 'lofi',
    'lofi-family': 'lofi',
    'subtle-cozy': 'lofi',
    'tape-retro': 'lofi',
    'dreamy-washed': 'lofi',
    experimental: 'lofi',
    spaces: 'spaces'
}

function fromLovelofi(
    preset: LovelofiPreset,
    group: QuickPresetGroup,
    section: string | undefined
): QuickPreset {
    const { slowdown, ...rest } = preset.settings
    const rate = slowdown.enabled ? slowdownRate(slowdown.intensity) : 1
    return {
        id: preset.id,
        name: sentence(preset.name),
        description: preset.description,
        group,
        section,
        icon: LOVELOFI_ICONS[preset.id] ?? 'sparkles',
        playback: rate === 1 ? pb({}) : pb({ rate, keepPitch: false }),
        effect: fx({}),
        lofi: lo({ ...rest, slowdown: { enabled: false, intensity: 0 } })
    }
}

const lovelofiGroup = (group: QuickPresetGroup): QuickPreset[] =>
    getBuiltInPresetSections()
        .filter((s) => LOVELOFI_GROUPS[s.id] === group)
        .flatMap((s) =>
            s.presets.map((p) =>
                fromLovelofi(p, group, group === 'lofi' ? sentence(s.title) : undefined)
            )
        )

export const QUICK_PRESETS: QuickPreset[] = [
    // Vibes: the internet's tempo and pitch edits.
    {
        id: 'nightcore',
        name: 'Nightcore',
        description: 'Faster and higher, the pitch riding up with the tempo.',
        group: 'vibes',
        icon: 'moon',
        playback: pb({ rate: 1.25, keepPitch: false }),
        effect: fx({}),
        lofi: lo()
    },
    {
        id: 'sped-up',
        name: 'Sped up',
        description: 'A touch faster and brighter, with a little studio air.',
        group: 'vibes',
        icon: 'fast-forward',
        playback: pb({ rate: 1.12, keepPitch: false }),
        effect: fx({}),
        lofi: lo({ reverb: { enabled: true, intensity: 15, profile: 'studio' } })
    },
    {
        id: 'sped-up-lofi',
        name: 'Sped-up lo-fi',
        description:
            'Faster and brighter, then softened: a little dull, warm, with some room and dust.',
        group: 'vibes',
        icon: 'rabbit',
        playback: pb({ rate: 1.15, keepPitch: false }),
        effect: fx({}),
        lofi: lo({
            lowPass: { enabled: true, intensity: 30 },
            tapeSaturation: { enabled: true, intensity: 16 },
            reverb: { enabled: true, intensity: 16, profile: 'studio' },
            vinylCrackle: { enabled: true, intensity: 10 }
        })
    },
    {
        id: 'slowed-reverb',
        name: 'Slowed + reverb',
        description: 'The classic edit: slower, lower, a little dull, and washed in a hall.',
        group: 'vibes',
        icon: 'rewind',
        playback: pb({ rate: 0.85, keepPitch: false }),
        effect: fx({}),
        lofi: lo({
            reverb: { enabled: true, intensity: 40, profile: 'hall' },
            lowPass: { enabled: true, intensity: 14 },
            tapeSaturation: { enabled: true, intensity: 10 }
        })
    },
    {
        id: 'slowed-bass',
        name: 'Slowed + bass',
        description: 'A touch slower with the low end pushed up and a little tape warmth.',
        group: 'vibes',
        icon: 'audio-waveform',
        playback: pb({ rate: 0.9, keepPitch: false }),
        effect: fx({}),
        lofi: lo({
            equalizer: eq([6, 3, 0, 0, 0]),
            tapeSaturation: { enabled: true, intensity: 14 }
        })
    },
    {
        id: 'chopped-screwed',
        name: 'Chopped & screwed',
        description: 'Houston slow: well under tempo, dark, thick and a little dusty.',
        group: 'vibes',
        icon: 'hourglass',
        playback: pb({ rate: 0.72, keepPitch: false }),
        effect: fx({}),
        lofi: lo({
            lowPass: { enabled: true, intensity: 22 },
            tapeSaturation: { enabled: true, intensity: 22 },
            vinylCrackle: { enabled: true, intensity: 6 }
        })
    },
    {
        id: 'daycore',
        name: 'Daycore',
        description: 'Slow and deep, nothing else touched.',
        group: 'vibes',
        icon: 'sun',
        playback: pb({ rate: 0.8, keepPitch: false }),
        effect: fx({}),
        lofi: lo()
    },
    {
        id: 'chipmunk',
        name: 'Chipmunk',
        description: 'Nine semitones up at the same tempo.',
        group: 'vibes',
        icon: 'chevrons-up',
        playback: pb({ semitone: 9 }),
        effect: fx({}),
        lofi: lo()
    },
    {
        id: 'demon',
        name: 'Demon',
        description: 'Seven semitones down at the same tempo, in a big dark hall.',
        group: 'vibes',
        icon: 'chevrons-down',
        playback: pb({ semitone: -7 }),
        effect: fx({}),
        lofi: lo({ reverb: { enabled: true, intensity: 28, profile: 'hall' } })
    },
    {
        id: 'drift',
        name: 'Drift',
        description:
            'The stereo field opened wide and slowly swaying from ear to ear, for headphones.',
        group: 'vibes',
        icon: 'orbit',
        playback: pb({}),
        effect: fx({ msProcessor: 'ultra-wide' }),
        lofi: lo({ stereoDrift: { enabled: true, intensity: 90 } })
    },

    // Lo-fi: lovelofi's catalogue, section by section, plus one of ours.
    ...lovelofiGroup('lofi'),
    {
        id: 'telephone',
        name: 'Telephone',
        description: 'A 300–3400 Hz phone line with a little carbon-mic crunch.',
        group: 'lofi',
        section: 'Experimental',
        icon: 'phone',
        playback: pb({}),
        effect: fx({}),
        lofi: lo({
            highPass: { enabled: true, intensity: 36 },
            lowPass: { enabled: true, intensity: 20 },
            bitcrusher: { enabled: true, intensity: 26 },
            tapeSaturation: { enabled: true, intensity: 24 }
        })
    },

    // Spaces: lovelofi's rooms, plus a stage.
    ...lovelofiGroup('spaces'),
    {
        id: 'live-show',
        name: 'Live show',
        description: 'A big hall, a touch of PA grit, and a wide stereo field.',
        group: 'spaces',
        icon: 'speaker',
        playback: pb({}),
        effect: fx({ msProcessor: 'wide' }),
        lofi: lo({
            reverb: { enabled: true, intensity: 36, profile: 'hall' },
            highPass: { enabled: true, intensity: 6 },
            tapeSaturation: { enabled: true, intensity: 12 },
            stereoDrift: { enabled: true, intensity: 8 }
        })
    },

    // Tools: listening and practice helpers.
    {
        id: 'bass-boost',
        name: 'Bass boost',
        description: 'Six dB more at 90 Hz, three at 250, a touch off the top.',
        group: 'tools',
        icon: 'audio-lines',
        playback: pb({}),
        effect: fx({}),
        lofi: lo({ equalizer: eq([6, 3, 0, 0, -1]) })
    },
    {
        id: 'podcast',
        name: 'Podcast',
        description: '1.5× with the pitch kept, rumble cut and speech brought forward.',
        group: 'tools',
        icon: 'podcast',
        playback: pb({ rate: 1.5 }),
        effect: fx({}),
        lofi: lo({
            equalizer: eq([-4, 0, 2, 3, -2]),
            highPass: { enabled: true, intensity: 12 }
        })
    },
    {
        id: 'karaoke',
        name: 'Karaoke',
        description: 'Centre vocals cut; bass and cymbals stay where they are.',
        group: 'tools',
        icon: 'mic-off',
        playback: pb({}),
        effect: fx({}),
        lofi: lo({ vocalCut: { enabled: true, intensity: 85 } })
    },
    {
        id: 'sing-along',
        name: 'Sing-along',
        description: 'Vocals lifted and centred so the words are easy to follow.',
        group: 'tools',
        icon: 'mic',
        playback: pb({}),
        effect: fx({ msProcessor: 'vocal-focus' }),
        lofi: lo({ equalizer: eq([-2, 0, 3, 4, 0]) })
    },
    {
        id: 'practice',
        name: 'Practice',
        description: '0.75× with the pitch kept, for learning a part.',
        group: 'tools',
        icon: 'music',
        playback: pb({ rate: 0.75 }),
        effect: fx({}),
        lofi: lo()
    },
    {
        id: 'mono',
        name: 'Mono',
        description: 'Both channels summed, for one earbud or a single speaker.',
        group: 'tools',
        icon: 'headphones',
        playback: pb({}),
        effect: fx({ msProcessor: 'mono' }),
        lofi: lo()
    }
]

export const quickPresetIds = QUICK_PRESETS.map((p) => p.id)
export const quickPresetById = (id: string) => QUICK_PRESETS.find((p) => p.id === id)

export type PresetSection = { title: string | null; presets: QuickPreset[] }

/** A group's presets in order, split wherever the section heading changes. */
export function sectionsOf(group: QuickPresetGroup, presets = QUICK_PRESETS): PresetSection[] {
    const out: PresetSection[] = []
    for (const preset of presets) {
        if (preset.group !== group) continue
        const title = preset.section ?? null
        const last = out[out.length - 1]
        if (last && last.title === title) last.presets.push(preset)
        else out.push({ title, presets: [preset] })
    }
    return out
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6

const LOFI_KEYS = [
    'lowPass',
    'highPass',
    'tapeSaturation',
    'bitcrusher',
    'chorus',
    'vinylCrackle',
    'pitchWobble',
    'stereoDrift',
    'dropout',
    'slowdown',
    'vocalCut'
] as const

/** Only effects that are on count; an idle effect's remembered intensity does not. */
function sameLofi(a: EffectSettings, b: EffectSettings): boolean {
    for (const key of LOFI_KEYS) {
        if (a[key].enabled !== b[key].enabled) return false
        if (a[key].enabled && !close(a[key].intensity, b[key].intensity)) return false
    }
    if (a.reverb.enabled !== b.reverb.enabled) return false
    if (
        a.reverb.enabled &&
        (!close(a.reverb.intensity, b.reverb.intensity) ||
            (a.reverb.profile ?? DEFAULT_REVERB_PROFILE) !==
                (b.reverb.profile ?? DEFAULT_REVERB_PROFILE))
    )
        return false
    const eqA = a.equalizer?.enabled ?? false
    const eqB = b.equalizer?.enabled ?? false
    if (eqA !== eqB) return false
    if (eqA) {
        const bandsA = a.equalizer?.bands ?? []
        const bandsB = b.equalizer?.bands ?? []
        if (bandsA.length !== bandsB.length) return false
        for (let i = 0; i < bandsA.length; i++) {
            if (!close(bandsA[i].gain, bandsB[i].gain) || !close(bandsA[i].freq, bandsB[i].freq))
                return false
        }
    }
    return true
}

/**
 * Whether two states sound the same. Pitch preservation only matters once the
 * rate moves, a reverb name is compared through its alias so a preset saved
 * under a retired name still matches its twin, and a state saved before the
 * lofi rack existed counts as having it off.
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
    if (a.effect.msProcessor !== b.effect.msProcessor) return false
    return sameLofi(normalizeEffectSettings(a.lofi), normalizeEffectSettings(b.lofi))
}

export const isNormal = (values: PresetValues) => sameValues(values, NORMAL_VALUES)

/** The first candidate whose values match, or null when nothing does. */
export function matchPreset<T extends PresetValues & { id: string }>(
    values: PresetValues,
    candidates: T[]
): T | null {
    return candidates.find((candidate) => sameValues(values, candidate)) ?? null
}

/** The rack EQ's bands, lowest first, as a listener would name them. */
const EQ_BAND_NAMES = ['bass', 'low mids', 'mids', 'presence', 'air']

const LOFI_LABELS: Record<(typeof LOFI_KEYS)[number], string> = {
    lowPass: 'low-pass',
    highPass: 'high-pass',
    tapeSaturation: 'tape',
    bitcrusher: 'crush',
    chorus: 'chorus',
    vinylCrackle: 'crackle',
    pitchWobble: 'wobble',
    stereoDrift: 'drift',
    dropout: 'dropout',
    slowdown: 'slow',
    vocalCut: 'vocal cut'
}

/**
 * A short, honest description of what a preset does: only the knobs that moved.
 * "1.25×", "+9 st", "hall", "Live EQ", "wide", then the rack's effects from the
 * strongest down. A changed rate lets the pitch follow unless it says "keep
 * pitch", the way sped-up and slowed edits work.
 */
export function recipe({ playback, effect, lofi }: PresetValues): string[] {
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

    const rack = normalizeEffectSettings(lofi)
    const on: { label: string; intensity: number }[] = LOFI_KEYS.filter(
        (key) => rack[key].enabled
    ).map((key) => ({ label: LOFI_LABELS[key], intensity: rack[key].intensity }))
    if (rack.reverb.enabled) {
        on.push({
            label: rack.reverb.profile ?? DEFAULT_REVERB_PROFILE,
            intensity: rack.reverb.intensity
        })
    }
    if (rack.equalizer?.enabled) {
        const bands = rack.equalizer.bands
        const strongest = bands.reduce((a, b) => (Math.abs(b.gain) > Math.abs(a.gain) ? b : a))
        if (Math.abs(strongest.gain) >= 0.5) {
            const index = bands.indexOf(strongest)
            on.push({
                label: `${strongest.gain > 0 ? '+' : '−'}${trim(Math.abs(strongest.gain))} dB ${EQ_BAND_NAMES[index] ?? 'EQ'}`,
                intensity: (Math.abs(strongest.gain) / 12) * 100
            })
        } else on.push({ label: 'EQ', intensity: 0 })
    }
    on.sort((x, y) => y.intensity - x.intensity)
    out.push(...on.map((x) => x.label))
    return out
}

const trim = (n: number) => String(Number(n.toFixed(3)))
