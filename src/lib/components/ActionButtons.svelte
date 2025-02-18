<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { playbackStore } from '$lib/stores/playback'
    import { effectsStore } from '$lib/stores/audio-effects'

    export let tab: string
    import { Button } from '$lib/components/ui/button'

    function getStore() {
        switch (tab) {
            case 'fx':
            case 'eq':
                return effectsStore
            // case 'snip':
            //     return null
            case 'speed':
                return playbackStore
            case 'seek':
                return seekStore
            default:
                return null
        }
    }

    async function handleReset() {
        const store = getStore()
        if (!store) return

        if (['fx', 'eq'].includes(tab)) {
            const key = tab === 'fx' ? 'reverb' : 'equalizer'
            await store?.reset(key)
        } else {
            await store?.reset()
        }
    }
</script>

<div class="absolute bottom-0 flex w-full items-center justify-end gap-x-2">
    {#if tab === 'snip'}
        <Button
            variant="outline"
            size="sm"
            class="h-6 rounded-[4px] border-none bg-purple-700 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-primary hover:bg-purple-800"
        >
            share
        </Button>
    {/if}
    <Button
        variant="outline"
        size="sm"
        class="h-6 rounded-[4px] border-none bg-red-700 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-primary hover:bg-red-800"
        onclick={handleReset}
    >
        reset
    </Button>
    <!-- <Button
        variant="outline"
        size="sm"
        class="h-6 rounded-[4px] border-none bg-green-700 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-primary hover:bg-green-800"
    >
        save
    </Button> -->
</div>
