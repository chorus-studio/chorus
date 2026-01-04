<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore, defaultPlayback } from '$lib/stores/playback'

    import ToggleSelect from '$lib/components/ToggleSelect.svelte'
    import PlaybackInput from '$lib/components/PlaybackInput.svelte'
    import { Separator } from '$lib/components/ui/separator'

    let { pip = false }: { pip?: boolean } = $props()

    async function setupSpeed() {
        const track = $nowPlaying?.playback ?? defaultPlayback
        await playbackStore.updatePlayback({ track, is_default: !$nowPlaying?.playback })
    }

    async function handleToggleSelect(value: string) {
        await playbackStore.updatePlayback({ is_default: value === 'default' })
        const type = $playbackStore.is_default ? 'default' : 'track'
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    onMount(() => {
        setupSpeed()
        return () => setupSpeed()
    })
</script>

<div class="columns-2 gap-x-2.5 space-y-3">
    <div class="flex h-48 flex-col">
        <PlaybackInput key="rate" list={$playbackStore.frequents.rate} />
        <Separator orientation="horizontal" class="!my-2 h-0.5" />
        <div class="mt-1 flex h-20 w-full flex-col gap-y-4">
            <ToggleSelect
                {pip}
                label={$playbackStore.is_default ? 'Default' : 'Track'}
                list={[
                    { label: 'D', value: 'default' },
                    { label: 'T', value: 'track' }
                ]}
                value={$playbackStore.is_default ? 'default' : 'track'}
                onValueChange={handleToggleSelect}
            />

            {#if $playbackStore.is_default}
                <p class="text-xs leading-none">Default mode applies settings to all tracks.</p>
            {:else}
                <p class="text-xs leading-none">
                    Track mode applies & saves settings to current track.
                </p>
            {/if}
        </div>
    </div>

    <div class="flex h-48 flex-col">
        <PlaybackInput key="pitch" list={$playbackStore.frequents.pitch} />
        <Separator orientation="horizontal" class="!my-2 h-0.5" />
        <PlaybackInput key="semitone" list={$playbackStore.frequents.semitone} />
    </div>
</div>
