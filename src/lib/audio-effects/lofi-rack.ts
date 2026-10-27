// Chorus's rack of the lovelofi effects (vendored under ./lofi, see its README):
// one input, one output, setEffects(settings). It mirrors lovelofi's
// GenEffectRack with two differences. Slowdown is left out, because Chorus slows
// the media element itself (quick-presets.ts turns a preset's slowdown into a
// playback rate). And the worklet and sample URLs come from the extension,
// since this runs inside the Spotify page where a relative path would 404.
import type AudioManager from './audio-manager'
import { LowPassEffect } from './lofi/audio/effects/low-pass'
import { HighPassEffect } from './lofi/audio/effects/high-pass'
import { TapeSaturationEffect } from './lofi/audio/effects/tape-saturation'
import { DEFAULT_REVERB_PROFILE, ReverbEffect } from './lofi/audio/effects/reverb'
import { BitcrusherEffect } from './lofi/audio/effects/bitcrusher'
import { ChorusEffect } from './lofi/audio/effects/chorus'
import { PitchWobbleEffect } from './lofi/audio/effects/pitch-wobble'
import { StereoDriftEffect } from './lofi/audio/effects/stereo-drift'
import { DropoutEffect } from './lofi/audio/effects/dropout'
import { VinylCrackleEffect } from './lofi/audio/effects/vinyl-crackle'
import { VocalCutEffect } from './lofi/audio/effects/vocal-cut'
import { EqualizerEffect } from './lofi/audio/effects/equalizer'
import {
    DEFAULT_EFFECT_SETTINGS,
    normalizeEffectSettings,
    type EffectSettings
} from './lofi/audio/effect-settings'

/** Worklet processors the rack registers, served from the extension's /worklets/. */
export const LOFI_WORKLETS = ['bitcrusher', 'pitch-wobble', 'stereo-drift', 'dropout', 'vocal-cut']

/** Whether any effect node would be doing work. Slowdown is a rate, not a node. */
export function hasLofiEffects(settings: EffectSettings): boolean {
    const { slowdown, equalizer, ...nodes } = settings
    void slowdown
    return Object.values(nodes).some((effect) => effect.enabled) || Boolean(equalizer?.enabled)
}

/**
 * Whether two settings differ only in intensities and EQ gains: the same
 * effects on, the same reverb space. Anything else means nodes join or leave
 * the chain, or an impulse response is regenerated, which wants the muted path.
 */
export function sameLofiShape(a: EffectSettings, b: EffectSettings): boolean {
    const { equalizer: eqA, ...nodesA } = a
    const { equalizer: eqB, ...nodesB } = b
    for (const key of Object.keys(nodesA) as (keyof typeof nodesA)[]) {
        if (nodesA[key].enabled !== nodesB[key].enabled) return false
    }
    if (
        (a.reverb.profile ?? DEFAULT_REVERB_PROFILE) !==
        (b.reverb.profile ?? DEFAULT_REVERB_PROFILE)
    )
        return false
    return Boolean(eqA?.enabled) === Boolean(eqB?.enabled)
}

type Nodes = {
    lowPass: LowPassEffect
    highPass: HighPassEffect
    tapeSaturation: TapeSaturationEffect
    reverb: ReverbEffect
    bitcrusher: BitcrusherEffect
    chorus: ChorusEffect
    pitchWobble: PitchWobbleEffect
    stereoDrift: StereoDriftEffect
    dropout: DropoutEffect
    vinylCrackle: VinylCrackleEffect
    vocalCut: VocalCutEffect
    equalizer: EqualizerEffect
}

export class LofiRack {
    readonly input: GainNode
    readonly output: GainNode
    private ctx: AudioContext
    private workletsUrl: string
    private sampleUrl?: string
    private nodes?: Nodes
    private dryBypass?: GainNode
    private processed?: GainNode
    private texture?: GainNode
    private sourceActive = true
    private ready?: Promise<void>

    constructor(ctx: AudioContext, urls: { workletsUrl: string; sampleUrl?: string }) {
        this.ctx = ctx
        this.workletsUrl = urls.workletsUrl
        this.sampleUrl = urls.sampleUrl
        this.input = ctx.createGain()
        this.output = ctx.createGain()
    }

    /** Load the worklets and build the chain once; later calls share the first. */
    init(): Promise<void> {
        if (!this.ready) {
            this.ready = this.build().catch((error) => {
                this.ready = undefined
                throw error
            })
        }
        return this.ready
    }

    get initialized(): boolean {
        return Boolean(this.nodes)
    }

    private async build(): Promise<void> {
        await Promise.all(
            LOFI_WORKLETS.map((name) =>
                this.ctx.audioWorklet.addModule(`${this.workletsUrl}${name}-processor.js`)
            )
        )

        const ctx = this.ctx
        const n: Nodes = {
            lowPass: new LowPassEffect(ctx),
            highPass: new HighPassEffect(ctx),
            tapeSaturation: new TapeSaturationEffect(ctx),
            reverb: new ReverbEffect(ctx),
            bitcrusher: new BitcrusherEffect(ctx),
            chorus: new ChorusEffect(ctx),
            pitchWobble: new PitchWobbleEffect(ctx),
            stereoDrift: new StereoDriftEffect(ctx),
            dropout: new DropoutEffect(ctx),
            vinylCrackle: new VinylCrackleEffect(ctx, this.sampleUrl),
            vocalCut: new VocalCutEffect(ctx),
            equalizer: new EqualizerEffect(ctx)
        }
        this.dryBypass = ctx.createGain()
        this.processed = ctx.createGain()
        this.texture = ctx.createGain()

        // The same order as lovelofi's rack, minus slowdown. The dry path is a
        // parallel gain that setBypass switches against the processed path, so
        // with nothing on the rack is a plain wire.
        this.input.connect(this.dryBypass)
        this.input.connect(n.lowPass.node)
        n.lowPass.node.connect(n.highPass.node)
        n.highPass.node.connect(n.vocalCut.node)
        n.vocalCut.node.connect(n.tapeSaturation.input)
        n.tapeSaturation.output.connect(n.bitcrusher.node)
        n.bitcrusher.node.connect(n.reverb.input)
        n.reverb.output.connect(n.chorus.input)
        n.chorus.output.connect(n.pitchWobble.node)
        n.pitchWobble.node.connect(n.stereoDrift.node)
        n.stereoDrift.node.connect(n.dropout.node)
        n.dropout.node.connect(this.processed)
        this.processed.connect(n.equalizer.input)
        n.equalizer.output.connect(this.output)
        this.dryBypass.connect(this.output)

        // Crackle is a looping sample mixed into the processed path. It is muted
        // while the element is paused so a paused Spotify stays silent.
        n.vinylCrackle.output.connect(this.texture)
        this.texture.connect(this.processed)
        this.texture.gain.value = this.sourceActive ? 1 : 0

        this.nodes = n
        this.setEffects(DEFAULT_EFFECT_SETTINGS)
    }

    setEffects(settings: EffectSettings): void {
        const n = this.nodes
        if (!n || !this.dryBypass || !this.processed) return
        const s = normalizeEffectSettings(settings)

        // Enabled first, then intensity: most effects ignore setIntensity while off.
        n.lowPass.enabled = s.lowPass.enabled
        n.lowPass.setIntensity(s.lowPass.intensity)
        n.highPass.enabled = s.highPass.enabled
        n.highPass.setIntensity(s.highPass.intensity)
        n.tapeSaturation.enabled = s.tapeSaturation.enabled
        n.tapeSaturation.setIntensity(s.tapeSaturation.intensity)
        n.reverb.enabled = s.reverb.enabled
        n.reverb.setProfile(s.reverb.profile ?? DEFAULT_REVERB_PROFILE)
        n.reverb.setIntensity(s.reverb.intensity)
        n.bitcrusher.enabled = s.bitcrusher.enabled
        n.bitcrusher.setIntensity(s.bitcrusher.intensity)
        n.chorus.enabled = s.chorus.enabled
        n.chorus.setIntensity(s.chorus.intensity)
        n.vinylCrackle.enabled = s.vinylCrackle.enabled
        n.vinylCrackle.setIntensity(s.vinylCrackle.intensity)
        n.pitchWobble.enabled = s.pitchWobble.enabled
        n.pitchWobble.setIntensity(s.pitchWobble.intensity)
        n.stereoDrift.enabled = s.stereoDrift.enabled
        n.stereoDrift.setIntensity(s.stereoDrift.intensity)
        n.dropout.enabled = s.dropout.enabled
        n.dropout.setIntensity(s.dropout.intensity)
        n.vocalCut.enabled = s.vocalCut.enabled
        n.vocalCut.setIntensity(s.vocalCut.intensity)
        n.equalizer.setSettings(s.equalizer ?? { enabled: false, bands: [] })

        const bypass = !hasLofiEffects(s)
        this.dryBypass.gain.value = bypass ? 1 : 0
        this.processed.gain.value = bypass ? 0 : 1
    }

    /** Pause mutes the crackle loop; play brings it back. */
    setSourceActive(active: boolean): void {
        this.sourceActive = active
        if (this.texture) this.texture.gain.value = active ? 1 : 0
    }

    destroy(): void {
        this.nodes?.vinylCrackle.destroy()
        this.nodes?.chorus.destroy()
        try {
            this.input.disconnect()
            this.output.disconnect()
        } catch {
            // never connected
        }
        this.nodes = undefined
        this.ready = undefined
    }
}

/**
 * Owner of the rack on the Chorus side, in the mould of Reverb / Equalizer /
 * MSProcessor: builds it lazily on the manager's AudioContext and keeps it in
 * the chain only while a lofi effect is on, so idle listening costs nothing.
 */
export default class Lofi {
    private _audioManager: AudioManager
    private rack: LofiRack | null = null
    private settings: EffectSettings = DEFAULT_EFFECT_SETTINGS
    private connected = false
    private playing = true

    constructor(audioManager: AudioManager) {
        this._audioManager = audioManager
    }

    get active(): boolean {
        return hasLofiEffects(this.settings)
    }

    /**
     * Build the rack if these settings will need it: five worklet modules and
     * the crackle sample, which takes a moment on a fresh page. Nothing in the
     * chain changes, so this runs with the music still audible; `apply` then
     * does only the wiring, which is what the caller mutes for.
     */
    async prepare(settings: EffectSettings): Promise<void> {
        if (hasLofiEffects(normalizeEffectSettings(settings))) await this.ensureRack()
    }

    apply(settings: EffectSettings): void {
        this.settings = normalizeEffectSettings(settings)

        if (!this.active) {
            this.rack?.setEffects(this.settings)
            if (this.connected) {
                this.connected = false
                this._audioManager.removeEffect('lofi')
            }
            return
        }

        // Not built: prepare() was skipped or failed (and said so).
        if (!this.rack?.initialized) return
        this.rack.setEffects(this.settings)
        if (!this.connected) {
            this.connected = true
            this._audioManager.connectLofi(this.rack)
        }
    }

    /**
     * A slider mid-drag: new intensities for effects that are already on, set
     * straight on the live rack with no mute and no chain rebuild. False when
     * the change needs the full path (an effect switched, a new reverb space,
     * or a rack that is still being built).
     */
    tweak(settings: EffectSettings): boolean {
        const next = normalizeEffectSettings(settings)
        if (!this.rack?.initialized || !this.connected || !sameLofiShape(this.settings, next))
            return false
        this.settings = next
        this.rack.setEffects(next)
        return true
    }

    /** audioManager.disconnect() drops every effect; put the rack back if it should be on. */
    reconnect(): void {
        this.connected = false
        if (this.rack?.initialized && this.active) {
            this.connected = true
            this._audioManager.connectLofi(this.rack)
        }
    }

    setPlaying(playing: boolean): void {
        this.playing = playing
        this.rack?.setSourceActive(playing)
    }

    private async ensureRack(): Promise<LofiRack | null> {
        const ctx = this._audioManager.audioContext
        if (!ctx) return null

        if (!this.rack) {
            const workletsUrl = sessionStorage.getItem('chorus:worklets_path')
            const soundsUrl = sessionStorage.getItem('chorus:sounds_path')
            if (!workletsUrl) {
                console.error('Lofi: worklets path not found in session storage')
                return null
            }
            this.rack = new LofiRack(ctx, {
                workletsUrl,
                sampleUrl: soundsUrl ? `${soundsUrl}vinyl-crackle.mp3` : undefined
            })
            this.rack.setSourceActive(this.playing)
        }

        try {
            await this.rack.init()
        } catch (error) {
            console.error('Lofi: failed to build the effect rack', error)
            return null
        }
        return this.rack
    }
}
