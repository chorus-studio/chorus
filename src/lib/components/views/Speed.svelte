<script lang="ts">
    import { onMount } from 'svelte'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore, defaultPlayback } from '$lib/stores/playback'

    import PlaybackInput from '$lib/components/PlaybackInput.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    async function setupSpeed() {
        const track = $nowPlaying?.playback ?? defaultPlayback
        await playbackStore.updatePlayback({ track, is_default: !$nowPlaying?.playback })
    }

    async function handleScope(value: string) {
        await playbackStore.updatePlayback({ is_default: value === 'default' })
        const type = $playbackStore.is_default ? 'default' : 'track'
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    onMount(() => {
        setupSpeed()
        return () => setupSpeed()
    })
</script>

<div class="flex flex-col gap-y-1.5">
    <div class="flex items-center justify-between gap-x-3">
        <SegmentedControl
            size="xs"
            ariaLabel="Scope"
            value={$playbackStore.is_default ? 'default' : 'track'}
            onValueChange={handleScope}
            options={[
                { label: 'All tracks', value: 'default', title: 'Applies to everything you play' },
                { label: 'This track', value: 'track', title: 'Saved with the current track' }
            ]}
        />
        <span class="truncate text-[11px] text-ink-muted">
            {#if $playbackStore.is_default}
                Applies to everything you play
            {:else}
                Saved with <span class="text-ink-fg-2">{$nowPlaying.title ?? 'this track'}</span>
            {/if}
        </span>
    </div>

    <PlaybackInput key="rate" list={$playbackStore.frequents.rate} />
    <PlaybackInput key="pitch" list={$playbackStore.frequents.pitch} />
    <PlaybackInput key="semitone" list={$playbackStore.frequents.semitone} />
</div>
