<script lang="ts">
    import { padSpeed, validateSpeed } from '$lib/utils/speed'
    import { defaultPlayback, playbackStore } from '$lib/stores/playback'
    import type { Rate, Playback, Frequent } from '$lib/stores/playback'

    import { Switch } from '$lib/components/ui/switch'
    import { Button } from '$lib/components/ui/button'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import BadgeList from '$lib/components/BadgeList.svelte'
    import CustomSlider from '$lib/components/ui/custom-slider/custom-slider.svelte'

    let { key, list }: { key: keyof Playback; list: Frequent[] } = $props()

    const META: Record<keyof Playback, { title: string; range: string; unit: string }> = {
        rate: { title: 'Rate', range: '0.25 – 4', unit: '×' },
        pitch: { title: 'Pitch', range: '0.25 – 4', unit: '×' },
        semitone: { title: 'Key', range: '−24 – +24', unit: 'st' }
    }
    const meta = $derived(META[key])

    async function handleInput(event: Event) {
        const input = event.target as HTMLInputElement
        const type = $playbackStore.is_default ? 'default' : 'track'
        const current = $playbackStore[type][
            key as keyof (typeof $playbackStore)[typeof type]
        ] as number
        const value = validateSpeed({ value: input.value, key, current })
        const updateValue =
            key == 'rate' ? { [key]: { ...$playbackStore[type][key], value } } : { [key]: value }
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], ...updateValue }
        })

        // Add the new value to frequents
        await playbackStore.addFrequentValue(key, value)
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleBadgeSelect(value: number) {
        const type = $playbackStore.is_default ? 'default' : 'track'
        const updateValue =
            key == 'rate' ? { [key]: { ...$playbackStore[type][key], value } } : { [key]: value }
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], ...updateValue }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleReset() {
        const type = $playbackStore.is_default ? 'default' : 'track'
        const value = defaultPlayback[key as keyof typeof defaultPlayback]
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], [key]: value }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handlePin(value: Frequent) {
        await playbackStore.togglePin(key, value.value)
    }

    // The slider. Rate and pitch run 0.25–4 on a log scale, so 1× sits in the
    // middle and 0.75 and 1.25 are the same distance from it; key is a semitone
    // a step. A drag plays live (throttled, nothing stored) and the release
    // commits the value the way typing it does, chips included.
    const UNITS = 1000
    const toPosition = (v: number) =>
        key === 'semitone' ? v : Math.round((Math.log(v) / Math.log(4) + 1) * (UNITS / 2))
    const fromPosition = (p: number) =>
        key === 'semitone' ? p : Number(Math.pow(4, p / (UNITS / 2) - 1).toFixed(2))
    const sliderMin = $derived(key === 'semitone' ? -24 : 0)
    const sliderMax = $derived(key === 'semitone' ? 24 : UNITS)

    let live = $state<number | null>(null)
    let pending: number | null = null
    let previewTimer: ReturnType<typeof setTimeout> | null = null

    const withValue = (v: number): Playback => {
        const type = $playbackStore.is_default ? 'default' : 'track'
        const playback = $playbackStore[type]
        return key === 'rate'
            ? { ...playback, rate: { ...playback.rate, value: v } }
            : { ...playback, [key]: v }
    }

    function handleSlide(position: number | number[]) {
        const v = fromPosition(position as number)
        live = v
        pending = v
        if (previewTimer) return
        previewTimer = setTimeout(() => {
            previewTimer = null
            if (pending === null) return
            playbackStore.dispatchPlaybackSettings(withValue(pending))
            pending = null
        }, 30)
    }

    async function handleSlideEnd(position: number | number[]) {
        const v = fromPosition(position as number)
        if (previewTimer) clearTimeout(previewTimer)
        previewTimer = null
        pending = null
        live = null
        const type = $playbackStore.is_default ? 'default' : 'track'
        await playbackStore.updatePlayback({ [type]: withValue(v) })
        await playbackStore.addFrequentValue(key, v)
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handlePitchPreservation(value: boolean) {
        const type = $playbackStore.is_default ? 'default' : 'track'

        await playbackStore.updatePlayback({
            [type]: {
                ...$playbackStore[type],
                [key]: {
                    preserves_pitch: value,
                    value: ($playbackStore[type][key] as Rate).value ?? 1
                }
            }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    const type = $derived($playbackStore.is_default ? 'default' : 'track')
    const value = $derived(
        key == 'rate'
            ? ($playbackStore[type][key] as Rate).value
            : ($playbackStore[type][key] as number)
    )
    const preservesPitch = $derived($playbackStore[type].rate.preserves_pitch)
    const format = (v: number) => (key === 'semitone' ? (v > 0 ? `+${v}` : String(v)) : String(v))
</script>

<div class="flex flex-col gap-y-1 rounded-lg border border-hairline bg-panel px-2.5 py-1">
    <div class="flex h-4 items-center justify-between">
        <div class="flex items-baseline gap-x-2">
            <span class="rack-label">{meta.title}</span>
            <span class="font-mono text-[9px] text-ink-muted">{meta.range}</span>
        </div>
        {#if key == 'rate'}
            <label class="flex items-center gap-x-1.5 text-[11px] text-ink-fg-2">
                Keep pitch
                <Switch checked={preservesPitch} onCheckedChange={handlePitchPreservation} />
            </label>
        {/if}
    </div>

    <div class="-my-0.5">
        <CustomSlider
            type="single"
            value={toPosition(value)}
            min={sliderMin}
            max={sliderMax}
            step={1}
            label={meta.title}
            onValueChange={handleSlide}
            onValueCommit={handleSlideEnd}
        />
    </div>

    <div class="flex items-center gap-x-1">
        <BadgeList {list} current={value} {format} handleSelect={handleBadgeSelect} {handlePin} />

        <div class="flex shrink-0 items-center gap-x-1">
            <input
                id={key}
                aria-label={meta.title}
                onchange={handleInput}
                value={padSpeed({ value: live ?? value, key })}
                class="readout h-6 w-[66px] text-right focus-visible:border-signal/60 focus-visible:outline-none"
            />
            <span class="w-4 font-mono text-[10px] text-ink-muted">{meta.unit}</span>
            <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Reset ${meta.title.toLowerCase()}`}
                title="Reset"
                onclick={handleReset}
            >
                <RotateCcw class="size-3.5" />
            </Button>
        </div>
    </div>
</div>
