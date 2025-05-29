<script lang="ts">
    import type { Playback } from '$lib/stores/playback'
    import { configStore, type AudioPreset } from '$lib/stores/config'
    import { padSpeed, getTitle, validateSpeed } from '$lib/utils/speed'

    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import { Button } from '$lib/components/ui/button'
    import { Switch } from '$lib/components/ui/switch'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'

    let {
        key,
        preset
    }: {
        key: keyof Playback
        preset: AudioPreset
    } = $props()

    async function handleSetPreset({ key, value }: { key: keyof Playback; value: number }) {
        const updatedPreset = $configStore.audio_presets.find(
            (p) => p.id === preset.id
        ) as AudioPreset
        if (!updatedPreset) return

        const validatedValue = validateSpeed({
            value,
            key,
            current: key == 'rate' ? updatedPreset.playback.rate.value : updatedPreset.playback[key]
        })

        const newPreset = {
            ...updatedPreset,
            playback: {
                ...updatedPreset.playback,
                [key]:
                    key === 'rate'
                        ? { ...updatedPreset.playback.rate, value: validatedValue }
                        : validatedValue
            }
        }

        await updatePreset(newPreset)
    }

    async function updatePreset(newPreset: AudioPreset) {
        await configStore.updateConfig({
            audio_presets: $configStore.audio_presets.map((p) =>
                p.id === preset.id ? newPreset : p
            )
        })
        configStore.updateAudioPreset({ preset: newPreset, type: 'playback' })
    }

    async function handleReset(event: MouseEvent) {
        event.preventDefault()
        event.stopPropagation()

        const newPreset = {
            ...preset,
            playback: {
                ...preset.playback,
                [key]:
                    key === 'rate' ? { ...preset.playback.rate, value: 1 } : key === 'pitch' ? 1 : 0
            }
        }
        await updatePreset(newPreset)
    }

    async function updateInput(event: Event) {
        const target = event.target as HTMLInputElement
        await handleSetPreset({ key, value: Number(target.value) })
    }

    async function togglePitchPreservation(checked: boolean) {
        const newPreset = {
            ...preset,
            playback: {
                ...preset.playback,
                rate: {
                    ...preset.playback.rate,
                    preserves_pitch: checked
                }
            }
        }
        await updatePreset(newPreset)
    }
</script>

<div class="flex w-full flex-col justify-between gap-y-2 rounded-md bg-primary-foreground p-4">
    <h2 class="text-base capitalize">{getTitle(key)}</h2>
    <div class="flex w-full items-center justify-between gap-x-2">
        <Label class="text-base">value</Label>

        <div class="flex w-full justify-end gap-x-2">
            <Input
                class="h-7 w-20"
                data-key={key}
                onchange={updateInput}
                value={padSpeed({
                    value: key === 'rate' ? preset.playback.rate.value : preset.playback[key],
                    key
                })}
            />

            <Button size="icon" variant="ghost" class="size-7 [&:svg]:size-4" onclick={handleReset}>
                <RotateCcw class="stroke-white" />
            </Button>
        </div>
    </div>

    {#if key === 'rate'}
        <div class="flex w-full justify-between gap-x-2">
            <Label for="rate" class="text-sm">preserves pitch</Label>
            <Switch
                data-key="preserves_pitch"
                checked={preset.playback.rate.preserves_pitch}
                onCheckedChange={togglePitchPreservation}
            />
        </div>
    {/if}
</div>
