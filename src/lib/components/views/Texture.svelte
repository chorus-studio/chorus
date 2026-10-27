<script lang="ts">
    // The lovelofi rack, knob by knob, drilled down to from the Presets tab:
    // twelve cells in a grid that fits the popover without scrolling. Each cell
    // is a switch (the name), an intensity slider and a readout; the rack's own
    // five-band EQ shows as a curve, since the EQ tab is where bands are
    // edited, and slowdown lives in Speed. Every change writes the lofi store,
    // so the cards' "tweaked from" line and the saved slots see exactly what is
    // playing.
    import { onMount } from 'svelte'

    import { configStore } from '$lib/stores/config'
    import { playbackStore, effectivePlayback } from '$lib/stores/playback'
    import { effectsStore } from '$lib/stores/effects'
    import { lofiStore, type LofiEffectKey } from '$lib/stores/lofi'
    import { hasLofiEffects } from '$lib/audio-effects/lofi-rack'
    import {
        QUICK_PRESETS,
        isNormal,
        matchPreset,
        type PresetValues
    } from '$lib/audio-effects/quick-presets'
    import { addPresetSlot, lastApplied } from '$lib/utils/quick-presets'
    import {
        DEFAULT_REVERB_PROFILE,
        type ReverbProfile
    } from '$lib/audio-effects/lofi/audio/effects/reverb'
    import { DEFAULT_EQUALIZER_BANDS } from '$lib/audio-effects/lofi/audio/effect-settings'

    import Plus from '@lucide/svelte/icons/plus'
    import ChevronLeft from '@lucide/svelte/icons/chevron-left'

    import CustomSlider from '$lib/components/ui/custom-slider/custom-slider.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { cn } from '$lib/utils.js'

    let { onBack }: { onBack: () => void } = $props()

    type Knob = { key: LofiEffectKey; label: string; title: string }
    type Cell = Knob | { key: 'equalizer' | 'reverb'; label: string; title: string }

    // The grid reads left to right in the order the rack processes: tone, then
    // colour, then motion, then wear. Titles say what the knob reaches.
    const CELLS: Cell[] = [
        { key: 'lowPass', label: 'Low-pass', title: 'Rolls the top end off, 4 kHz down to 400 Hz' },
        { key: 'highPass', label: 'High-pass', title: 'Thins the bottom out, 20 Hz up to 800 Hz' },
        {
            key: 'equalizer',
            label: 'EQ',
            title: "The rack's five bands, as the preset set them. Shape bands in the EQ tab."
        },
        { key: 'tapeSaturation', label: 'Tape', title: 'Soft tape saturation: warmth, then grit' },
        { key: 'bitcrusher', label: 'Crush', title: 'Fewer bits and a lower sample rate' },
        { key: 'reverb', label: 'Reverb', title: 'How much of the space is mixed in' },
        { key: 'chorus', label: 'Chorus', title: 'A detuned copy for shimmer and width' },
        { key: 'pitchWobble', label: 'Wobble', title: 'Tape-speed flutter in the pitch' },
        {
            key: 'stereoDrift',
            label: 'Drift',
            title: 'A slow sway from ear to ear, 0.05 to 0.5 Hz'
        },
        { key: 'vinylCrackle', label: 'Crackle', title: 'A looping vinyl surface under the music' },
        { key: 'dropout', label: 'Dropout', title: 'Brief gaps, like a worn tape' },
        {
            key: 'vocalCut',
            label: 'Vocal cut',
            title: 'Cancels the centre, 300–3000 Hz widening to 150–6000 Hz'
        }
    ]

    const PROFILES: { value: ReverbProfile; label: string; title: string }[] = [
        { value: 'studio', label: 'Studio', title: 'Short and clean, 0.9 s' },
        { value: 'room', label: 'Room', title: 'A medium room, 1.4 s' },
        { value: 'hall', label: 'Hall', title: 'Big and dark, 3.6 s' },
        { value: 'spring', label: 'Spring', title: 'Bright and twangy, 1.8 s' },
        { value: 'cassette', label: 'Cassette', title: 'Dull and tight, 0.7 s' }
    ]

    let notice = $state('')
    let noticeTimer: ReturnType<typeof setTimeout> | null = null

    const rack = $derived($lofiStore)
    const on = $derived(hasLofiEffects(rack))
    const eq = $derived(rack.equalizer ?? { enabled: false, bands: [...DEFAULT_EQUALIZER_BANDS] })
    const profile = $derived(rack.reverb.profile ?? DEFAULT_REVERB_PROFILE)
    // The curve's strongest move, "+6 dB" or "−4 dB"; "flat" when nothing moved.
    const eqPeak = $derived.by(() => {
        const strongest = eq.bands.reduce((a, b) => (Math.abs(b.gain) > Math.abs(a.gain) ? b : a))
        if (Math.abs(strongest.gain) < 0.5) return 'flat'
        return `${strongest.gain > 0 ? '+' : '−'}${Number(Math.abs(strongest.gain).toFixed(1))} dB`
    })

    // What is playing, from the same stores every tab edits, so the status line
    // and the Presets tab can never disagree.
    const current = $derived<PresetValues>({
        playback: effectivePlayback($playbackStore),
        effect: $effectsStore,
        lofi: rack
    })
    const mine = $derived($configStore.audio_presets)
    const active = $derived(matchPreset(current, [...QUICK_PRESETS, ...mine]))
    const normal = $derived(isNormal(current))
    const statusName = $derived(!on ? 'Texture off' : active ? active.name : 'Custom texture')
    const tweakedFrom = $derived(on && !active ? $lastApplied : null)

    const isKnob = (cell: Cell): cell is Knob => cell.key !== 'equalizer' && cell.key !== 'reverb'
    const enabled = (cell: Cell) =>
        cell.key === 'equalizer' ? eq.enabled : rack[cell.key as LofiEffectKey].enabled

    function say(text: string) {
        notice = text
        if (noticeTimer) clearTimeout(noticeTimer)
        noticeTimer = setTimeout(() => (notice = ''), 2500)
    }

    function toggle(cell: Cell) {
        if (cell.key === 'equalizer') return lofiStore.setEqualizer({ enabled: !eq.enabled })
        const key = cell.key as LofiEffectKey
        return lofiStore.update(key, { enabled: !rack[key].enabled })
    }

    /** Picking a space turns the reverb on if it was off; the profile is the point of it. */
    function setProfile(value: string) {
        const next = value as ReverbProfile
        if (next === profile && rack.reverb.enabled) return
        return lofiStore.update('reverb', { profile: next, enabled: true })
    }

    async function save() {
        if (normal) return
        const name = active?.name ?? `Preset ${mine.length + 1}`
        const slot = await addPresetSlot(current, name)
        if (slot === null) say('All five slots are used · remove one in Mine')
        else say(`Saved as ${name} · slot ${slot} · see Mine`)
    }

    /** Bar height for a band's gain: ±12 dB fills half the 12 px box. */
    const bar = (gain: number) => Math.round((Math.min(12, Math.abs(gain)) / 12) * 6)
    const curveLabel = $derived(
        eq.bands
            .map(
                (band, i) =>
                    `${['90 Hz', '250 Hz', '1 kHz', '3.5 kHz', '9 kHz'][i]} ${band.gain > 0 ? '+' : ''}${Number(band.gain.toFixed(1))} dB`
            )
            .join(', ')
    )

    onMount(() => () => {
        if (noticeTimer) clearTimeout(noticeTimer)
    })
</script>

<div class="flex h-full flex-col gap-y-2">
    <div class="flex h-[22px] items-center justify-between gap-x-2">
        <div class="flex min-w-0 items-center gap-x-2 text-xs text-ink-fg-2">
            <button
                type="button"
                onclick={onBack}
                title="Back to the preset cards"
                class="chorus-focus -ml-1 inline-flex h-[22px] shrink-0 items-center gap-x-0.5 rounded-md pl-0.5 pr-1.5 text-ink-fg-2 transition-colors hover:bg-surface-2 hover:text-ink-fg"
            >
                <ChevronLeft class="size-3.5" />
                Presets
            </button>
            <span class="led {on ? '' : 'led-off'}"></span>
            {#if notice}
                <span class="truncate text-amber">{notice}</span>
            {:else}
                <span class="truncate">
                    {#if tweakedFrom}
                        tweaked from <span class="font-medium text-ink-fg">{tweakedFrom}</span>
                    {:else}
                        <span class="font-medium text-ink-fg">{statusName}</span>
                    {/if}
                </span>
            {/if}
        </div>
        <button
            type="button"
            onclick={save}
            disabled={normal}
            title={normal
                ? 'Nothing is on. Switch an effect on first.'
                : 'Save the current rate, pitch, key, reverb, EQ, stereo and texture as a Mine slot'}
            class="chorus-focus inline-flex h-[22px] shrink-0 items-center gap-x-1 rounded-md px-1.5 text-[11px] text-amber transition-colors enabled:hover:bg-surface-2 disabled:opacity-40"
        >
            <Plus class="size-3" />
            Save as preset
        </button>
    </div>

    <div class="grid grid-cols-3 gap-1.5" role="group" aria-label="Texture effects">
        {#each CELLS as cell (cell.key)}
            {@const isOn = enabled(cell)}
            <div
                class={cn(
                    'flex h-[42px] flex-col gap-y-1 rounded-lg border px-2 pb-[5px] pt-[5px] transition-colors',
                    isOn ? 'border-hairline bg-panel' : 'border-hairline bg-panel/60'
                )}
            >
                <div class={cn('flex h-3 items-center gap-x-1', !isOn && 'opacity-55')}>
                    <button
                        type="button"
                        aria-pressed={isOn}
                        title={`${cell.title}. Tap to switch ${isOn ? 'off' : 'on'}.`}
                        onclick={() => toggle(cell)}
                        class="chorus-focus flex min-w-0 items-center gap-x-[5px] rounded-sm"
                    >
                        <span class="led size-1.5 {isOn ? '' : 'led-off'}" aria-hidden="true"
                        ></span>
                        <span class="rack-label truncate text-ink-muted">{cell.label}</span>
                    </button>
                    <span
                        class="ml-auto shrink-0 font-mono text-[10px] tabular-nums leading-none text-ink-fg-2"
                    >
                        {#if cell.key === 'equalizer'}
                            {eqPeak}
                        {:else}
                            {Math.round(rack[cell.key].intensity)}
                        {/if}
                    </span>
                </div>

                {#if cell.key === 'equalizer'}
                    <div
                        role="img"
                        aria-label={`EQ curve: ${curveLabel}`}
                        class={cn(
                            'relative grid h-4 grid-cols-5 gap-x-[3px] px-0.5',
                            !isOn && 'opacity-55'
                        )}
                    >
                        <span
                            aria-hidden="true"
                            class="absolute inset-x-0 top-[7px] h-px bg-surface-2"
                        ></span>
                        {#each eq.bands as band, i (i)}
                            <span class="relative">
                                <span
                                    class={cn(
                                        'absolute inset-x-0 rounded-[1px]',
                                        isOn ? 'bg-signal' : 'bg-ink-muted',
                                        Math.abs(band.gain) < 0.5 && 'opacity-40'
                                    )}
                                    style={band.gain >= 0
                                        ? `bottom: 8px; height: ${Math.max(2, bar(band.gain))}px`
                                        : `top: 8px; height: ${Math.max(2, bar(band.gain))}px`}
                                ></span>
                            </span>
                        {/each}
                    </div>
                {:else}
                    {@const key = cell.key as LofiEffectKey}
                    <CustomSlider
                        type="single"
                        min={0}
                        max={100}
                        step={1}
                        disabled={!isOn}
                        label={`${cell.label} intensity`}
                        value={rack[key].intensity}
                        onValueChange={(v) => lofiStore.tweak(key, v as number)}
                        onValueCommit={() => lofiStore.commit()}
                    />
                {/if}
            </div>
        {/each}
    </div>

    {#if on}
        <div class="flex h-6 items-center gap-x-2.5">
            <span
                class={cn('rack-label shrink-0', !rack.reverb.enabled && 'opacity-55')}
                title={rack.reverb.enabled
                    ? "The reverb's space"
                    : 'Pick a space to switch the reverb on'}
            >
                Space
            </span>
            <SegmentedControl
                size="xs"
                ariaLabel="Reverb space"
                value={rack.reverb.enabled ? profile : ''}
                onValueChange={setProfile}
                options={PROFILES}
                class={cn(!rack.reverb.enabled && 'opacity-70')}
            />
        </div>
    {:else}
        <p class="text-[10px] leading-3 text-ink-dim">
            Tap a name to switch it on. Speed lives in the Speed tab; the 10-band EQ in EQ.
        </p>
    {/if}
</div>
