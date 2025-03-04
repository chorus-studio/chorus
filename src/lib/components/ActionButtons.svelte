<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { snipStore } from '$lib/stores/snip'
    import { dataStore } from '$lib/stores/data'
    import { playbackStore } from '$lib/stores/playback'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { effectsStore } from '$lib/stores/audio-effects'

    import { Button } from '$lib/components/ui/button'

    let { tab } = $props()

    function getStore() {
        switch (tab) {
            case 'fx':
            case 'eq':
                return effectsStore
            case 'snip':
                return snipStore
            case 'speed':
                return playbackStore
            case 'seek':
                return seekStore
            default:
                return null
        }
    }

    async function resetSnip() {
        const defaultTimes = { start_time: 0, end_time: $nowPlaying.duration }
        snipStore.set({ is_shared: false, last_updated: 'start', ...defaultTimes })
        const track = getTrack()
        if (!track) return

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: { snipped: false, ...defaultTimes }
        })
        nowPlaying.set({
            ...$nowPlaying,
            snipped: false,
            start_time: 0,
            end_time: $nowPlaying.duration
        })
    }

    function getTrack() {
        return $nowPlaying.track_id
            ? dataStore.collectionObject[$nowPlaying.track_id]
            : dataStore.collection.find((x) => x.song_id == $nowPlaying.id)
    }

    async function saveSnip() {
        const track = getTrack()
        if (!track) return

        if (!$snipStore) return

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: {
                snipped: true,
                start_time: $snipStore.start_time!,
                end_time: $snipStore.end_time!
            }
        })
        nowPlaying.set({
            ...$nowPlaying,
            snipped: true,
            start_time: $snipStore.start_time!,
            end_time: $snipStore.end_time!
        })
    }

    async function handleSave() {
        if (tab === 'snip') {
            await saveSnip()
        }
    }

    async function handleReset() {
        const store = getStore()
        if (!store) return

        if (['fx', 'eq'].includes(tab)) {
            const key = tab === 'fx' ? 'reverb' : 'equalizer'
            await store?.reset(key)
        } else if (tab == 'snip') {
            await resetSnip()
        } else {
            await store?.reset()
        }
    }
</script>

<div class="absolute bottom-0 flex w-full items-center justify-between gap-x-2">
    {#if ['fx', 'eq', 'snip', 'speed', 'seek'].includes(tab)}
        <Button
            variant="outline"
            size="sm"
            class="h-6 rounded-[4px] border-none bg-red-700 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-primary hover:bg-red-800"
            onclick={handleReset}
        >
            {tab !== 'snip' ? 'reset' : $nowPlaying.snipped ? 'delete' : 'reset'}
        </Button>
    {/if}

    <div class="flex items-center justify-between gap-x-2 self-end">
        {#if tab === 'snip'}
            <!-- TODO: add share button -->
            <!-- <Button
                variant="outline"
                size="sm"
                class="h-6 rounded-[4px] border-none bg-purple-700 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-primary hover:bg-purple-800"
            >
                share
            </Button> -->
            <Button
                variant="outline"
                size="sm"
                onclick={handleSave}
                class="h-6 rounded-[4px] border-none bg-green-700 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-primary hover:bg-green-800"
            >
                save
            </Button>
        {/if}
    </div>
</div>
