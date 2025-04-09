<script lang="ts">
    import MediaButton from './MediaButton.svelte'
    import { mediaStore, type Media } from '$lib/stores/media'

    let { port, pip }: { port: chrome.runtime.Port | null; pip: boolean } = $props()
    let svgsList = $state([
        'save/unsave',
        'block-track',
        'loop',
        'shuffle',
        'seek-rewind',
        'previous',
        $mediaStore.playing ? 'pause' : 'play',
        'next',
        'seek-forward',
        $mediaStore.dj ? 'dj' : $mediaStore.repeat == 'one' ? 'repeat1' : 'repeat'
    ])
    const seek = { viewBox: '0 0 64 64', strokeWidth: 7 }
    const repeat = { strokeWidth: 0.5, size: 24 }

    const svgProps: Record<string, { viewBox?: string; size?: number; strokeWidth?: number }> = {
        'seek-rewind': seek,
        'seek-forward': seek,
        repeat,
        repeat1: repeat,
        previous: {
            size: 24
        },
        next: {
            size: 24
        },
        dj: {
            size: 16,
            viewBox: '-4 -4 24 24',
            strokeWidth: 0.5
        },
        'save/unsave': {
            viewBox: '-3 -5 24 24',
            size: 22,
            strokeWidth: 2
        },
        'block-track': {
            viewBox: '-1 -3 24 24',
            size: 22,
            strokeWidth: 0.8
        },
        loop: {
            viewBox: '0 -2 32 32',
            strokeWidth: 0.2,
            size: 20
        },
        default: {
            viewBox: '-4 -4 24 24',
            size: 20,
            strokeWidth: 1
        }
    }

    function handleClick(role: string) {
        port?.postMessage({ type: 'controls', key: role })
    }

    onMount(() => {
        const unsubscribe = mediaStore.subscribe((state: Media) => {
            svgsList = [
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
        })
        return () => unsubscribe()
    })
</script>

<div class="flex w-full items-center justify-between {pip ? 'gap-2' : 'gap-1'}">
    <div class="flex {pip ? 'w-20' : 'w-16'} items-center justify-between">
        {#each svgsList.slice(0, 3) as svg}
            <MediaButton icon={svg} {...svgProps?.[svg] || svgProps.default} {handleClick} />
        {/each}
    </div>

    <div class="flex w-full items-center {pip ? 'justify-between' : ''} gap-1.5">
        {#each svgsList.slice(3) as svg}
            <MediaButton icon={svg} {...svgProps?.[svg] || svgProps.default} {handleClick} />
        {/each}
    </div>
</div>
