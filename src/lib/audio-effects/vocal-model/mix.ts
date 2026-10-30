/**
 * The stem mix the vocal separator plays: how loud the vocals and the
 * instruments are, each as a factor (1 = as in the track, 0 = gone, up to 2 =
 * twice as loud). (1, 1) is the track itself; (1, 0) the instrumental;
 * (0, 1) the acapella; anything in between is a karaoke-style blend.
 */
export type StemMix = { vocals: number; instruments: number }

export const MIX_MAX = 2
export const ORIGINAL_MIX: StemMix = { vocals: 1, instruments: 1 }
export const DEFAULT_MIX: StemMix = { vocals: 0, instruments: 1 }

export const MIX_PRESETS: Array<{ id: string; label: string; mix: StemMix; hint: string }> = [
    {
        id: 'instrumental',
        label: 'Instrumental',
        mix: { vocals: 0, instruments: 1 },
        hint: 'No vocals'
    },
    {
        id: 'karaoke',
        label: 'Karaoke',
        mix: { vocals: 0.25, instruments: 1 },
        hint: 'A whisper of the vocals to follow'
    },
    {
        id: 'acapella',
        label: 'Acapella',
        mix: { vocals: 1, instruments: 0 },
        hint: 'Only the vocals'
    },
    {
        id: 'vocals-up',
        label: 'Vocals up',
        mix: { vocals: 1.5, instruments: 1 },
        hint: 'Vocals 3.5 dB louder'
    }
]

const clampFactor = (value: unknown) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return 1
    return Math.round(Math.min(MIX_MAX, Math.max(0, n)) * 100) / 100
}

export function clampMix(mix: Partial<StemMix> | null | undefined): StemMix {
    return {
        vocals: clampFactor(mix?.vocals ?? DEFAULT_MIX.vocals),
        instruments: clampFactor(mix?.instruments ?? DEFAULT_MIX.instruments)
    }
}

export const sameMix = (a: StemMix, b: StemMix) =>
    Math.abs(a.vocals - b.vocals) < 0.005 && Math.abs(a.instruments - b.instruments) < 0.005

/** The preset a mix matches, if any. */
export function presetOf(mix: StemMix) {
    return MIX_PRESETS.find((preset) => sameMix(preset.mix, mix)) ?? null
}

/**
 * Blend one channel: the instruments stem at its factor plus the vocals, taken
 * as what the model left out of the instruments (mix − instrumental), at
 * theirs. At (1, 1) this gives the original back exactly.
 */
export function blendStems(original: Float32Array, instrumental: Float32Array, mix: StemMix) {
    const n = Math.min(original.length, instrumental.length)
    const out = new Float32Array(n)
    const { vocals, instruments } = mix
    for (let i = 0; i < n; i++) {
        const inst = instrumental[i]
        out[i] = inst * instruments + (original[i] - inst) * vocals
    }
    return out
}

export function scaleStem(stem: Float32Array, factor: number) {
    if (factor === 1) return stem
    const out = new Float32Array(stem.length)
    for (let i = 0; i < stem.length; i++) out[i] = stem[i] * factor
    return out
}
