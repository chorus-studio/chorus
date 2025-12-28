<script lang="ts">
    import { crossfadeSettings } from '$lib/stores/crossfade'
    import type { CrossfadeType } from '$lib/audio-effects/crossfade/types'

    import { Label } from '$lib/components/ui/label'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'

    import type { Selection } from '$lib/types'
    import { DEFAULT_CROSSFADE_SETTINGS } from '$lib/audio-effects/crossfade/types'

    const fadeTypeOptions: Selection[] = [
        { label: 'Equal Power', value: 'equal-power' },
        { label: 'Exponential', value: 'exponential' },
        { label: 'Linear', value: 'linear' }
    ]

    function updateEnabled(value: boolean) {
        crossfadeSettings.update((s) => ({ ...s, enabled: value }))
    }

    function updateDuration(value: number) {
        const duration = Math.max(3, Math.min(12, value))
        crossfadeSettings.update((s) => ({ ...s, duration }))
    }

    function updateType(value: string) {
        crossfadeSettings.update((s) => ({ ...s, type: value as CrossfadeType }))
    }

    function updateMinTrackLength(value: number) {
        const minTrackLength = Math.max(0, Math.min(300, value))
        crossfadeSettings.update((s) => ({ ...s, minTrackLength }))
    }

    function resetToDefaults() {
        crossfadeSettings.set(DEFAULT_CROSSFADE_SETTINGS)
    }
</script>

<div class="flex w-full flex-col gap-y-4 p-4">
    <div class="flex flex-col gap-y-2">
        <h2 class="text-lg font-semibold text-white">Crossfade Settings</h2>
        <p class="text-sm text-gray-400">
            Enable Spotify Desktop-style crossfade between tracks. Audio chunks are intercepted and overlapped for smooth transitions.
        </p>
    </div>

    <Separator class="h-0.5 w-full" />

    <!-- Enable/Disable Toggle -->
    <div class="flex items-center justify-between">
        <div class="flex flex-col gap-y-1">
            <Label for="crossfade-enabled" class="text-sm font-medium text-white">
                Enable Crossfade
            </Label>
            <p class="text-xs text-gray-400">
                Smoothly transition between tracks with overlapping audio
            </p>
        </div>
        <Button
            id="crossfade-enabled"
            variant={$crossfadeSettings.enabled ? 'default' : 'outline'}
            size="sm"
            onclick={() => updateEnabled(!$crossfadeSettings.enabled)}
            class="min-w-20"
        >
            {$crossfadeSettings.enabled ? 'Enabled' : 'Disabled'}
        </Button>
    </div>

    <Separator class="h-0.5 w-full" />

    <!-- Crossfade Duration -->
    <div class="flex flex-col gap-y-2">
        <div class="flex items-center justify-between">
            <Label for="crossfade-duration" class="text-sm font-medium text-white">
                Fade Duration
            </Label>
            <span class="text-sm text-gray-300">{$crossfadeSettings.duration}s</span>
        </div>
        <input
            id="crossfade-duration"
            type="range"
            min="3"
            max="12"
            step="1"
            value={$crossfadeSettings.duration}
            oninput={(e) => updateDuration(Number(e.currentTarget.value))}
            class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-green-500"
            disabled={!$crossfadeSettings.enabled}
        />
        <div class="flex justify-between text-xs text-gray-400">
            <span>3s (Short)</span>
            <span>6s (Default)</span>
            <span>12s (Long)</span>
        </div>
    </div>

    <Separator class="h-0.5 w-full" />

    <!-- Fade Curve Type -->
    <div class="flex flex-col gap-y-2">
        <Label for="crossfade-type" class="text-sm font-medium text-white">
            Fade Curve Type
        </Label>
        <CustomSelect
            key="crossfade-type"
            selected={$crossfadeSettings.type}
            options={fadeTypeOptions}
            onValueChange={updateType}
            disabled={!$crossfadeSettings.enabled}
        />
        <p class="text-xs text-gray-400">
            {#if $crossfadeSettings.type === 'equal-power'}
                Maintains constant perceived loudness (recommended)
            {:else if $crossfadeSettings.type === 'exponential'}
                Natural-sounding decay, good for most music
            {:else}
                Simple linear fade, may have slight volume dip
            {/if}
        </p>
    </div>

    <Separator class="h-0.5 w-full" />

    <!-- Minimum Track Length -->
    <div class="flex flex-col gap-y-2">
        <div class="flex items-center justify-between">
            <Label for="crossfade-min-length" class="text-sm font-medium text-white">
                Minimum Track Length
            </Label>
            <span class="text-sm text-gray-300">{$crossfadeSettings.minTrackLength}s</span>
        </div>
        <input
            id="crossfade-min-length"
            type="range"
            min="0"
            max="120"
            step="10"
            value={$crossfadeSettings.minTrackLength}
            oninput={(e) => updateMinTrackLength(Number(e.currentTarget.value))}
            class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-green-500"
            disabled={!$crossfadeSettings.enabled}
        />
        <p class="text-xs text-gray-400">
            Don't crossfade tracks shorter than this duration (prevents fading very short tracks)
        </p>
    </div>

    <Separator class="h-0.5 w-full" />

    <!-- Reset Button -->
    <div class="flex w-full justify-between pt-2">
        <Button
            size="sm"
            variant="ghost"
            class="gap-x-2"
            onclick={resetToDefaults}
        >
            <RotateCcw class="size-4" />
            Reset to Defaults
        </Button>
        <div class="flex items-center gap-x-2">
            <div class={`size-2 rounded-full ${$crossfadeSettings.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span class="text-xs text-gray-400">
                {$crossfadeSettings.enabled ? 'Crossfade Active' : 'Crossfade Inactive'}
            </span>
        </div>
    </div>
</div>
