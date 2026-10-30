<script lang="ts">
    import { onMount } from 'svelte'
    import MediaButton from './MediaButton.svelte'
    import { seekStore } from '$lib/stores/seek'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { mediaStore, type Media } from '$lib/stores/media'

    let { port, pip = false }: { port: chrome.runtime.Port | null; pip?: boolean } = $props()

    function buildList(state: Media) {
        return [
            'save/unsave',
            'block-track',
            'loop',
            'shuffle',
            'seek-rewind',
            'previous',
            state.playing ? 'pause' : 'play',
            'next',
            'seek-forward',
            state.dj ? 'dj' : state.repeat == 'one' ? 'repeat1' : 'repeat'
        ]
    }

    let svgsList = $state(buildList($mediaStore))

    async function handleClick(role: string) {
        // In PiP, handle seek directly — postMessage reaches MAIN world from content script context
        if (pip && (role === 'seek-forward' || role === 'seek-rewind')) {
            const isForward = role === 'seek-forward'
            const isLongForm = $seekStore.media_type === 'long_form'
            const offset = isForward
                ? isLongForm
                    ? $seekStore.long_form.forward
                    : $seekStore.default.forward
                : isLongForm
                  ? $seekStore.long_form.rewind
                  : $seekStore.default.rewind
            // Only clamp forward seeks when duration is known — 0 means "never
            // known", and clamping to it would restart the track.
            const target = isForward
                ? $nowPlaying.duration > 0
                    ? Math.min($nowPlaying.current + offset, $nowPlaying.duration)
                    : $nowPlaying.current + offset
                : Math.max($nowPlaying.current - offset, 0)
            window.postMessage({ type: 'FROM_CURRENT_TIME_LISTENER', data: target }, '*')
            return
        }

        port?.postMessage({ type: 'controls', key: role })
        if (role == 'play' && !$mediaStore.playing && !$mediaStore.active) {
            await mediaStore.setActive(true)
            port?.postMessage({ type: 'init_media' })
        }
    }

    onMount(() => {
        const unsubscribe = mediaStore.subscribe((state: Media) => {
            svgsList = buildList(state)
        })
        return () => unsubscribe()
    })
</script>

<div class="flex w-full items-center justify-between {pip ? 'gap-x-2' : 'gap-x-1'}">
    <div class="flex items-center gap-x-0">
        {#each svgsList.slice(0, 3) as svg (svg)}
            <MediaButton icon={svg} {pip} {handleClick} />
        {/each}
    </div>

    <div class="flex items-center gap-x-0">
        {#each svgsList.slice(3) as svg (svg)}
            <MediaButton icon={svg} {pip} {handleClick} />
        {/each}
    </div>
</div>
