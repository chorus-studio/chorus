<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'

    import { nowPlaying } from '$lib/stores/now-playing'
    import { getColours } from '$lib/utils/vibrant-colors'
    import { getEnabled, setEnabled, watchEnabled } from '$lib/stores/enabled'
    import { settingsStore, type ThemeVibrancy } from '$lib/stores/settings'

    import PopUp from '$lib/components/views/PopUp.svelte'
    import PowerOffOverlay from '$lib/components/PowerOffOverlay.svelte'

    let loading = $state(false)
    // undefined until the persisted flag resolves, so we never flash the on-state
    // UI before knowing the extension is off.
    let enabled = $state<boolean | undefined>(undefined)

    function getVibrancy(): ThemeVibrancy {
        return $settingsStore.theme.vibrancy
    }

    async function loadColours() {
        if (!$nowPlaying.cover) return

        const vibrancy = getVibrancy()
        const { bg_colour = '#e3e3e3', text_colour = '#fafafa' } = await getColours({
            url: $nowPlaying.cover,
            vibrancy
        })

        document.documentElement.style.setProperty('--bg', bg_colour)
        document.documentElement.style.setProperty('--text', text_colour)

        await nowPlaying.updateState({ bg_colour, text_colour })
    }

    async function init() {
        loading = true
        await loadColours()
        loading = false
    }

    onMount(() => {
        init()
        getEnabled().then((value) => (enabled = value))
        const unwatch = watchEnabled((value) => (enabled = value))
        return () => unwatch()
    })
</script>

{#if enabled === undefined}
    <div class="h-[170px] w-[300px] bg-[var(--bg)]"></div>
{:else if !enabled}
    <PowerOffOverlay onenable={() => setEnabled(true)} />
{:else if loading}
    <div
        class="flex h-[170px] w-[300px] items-center justify-center bg-[var(--bg)] text-[var(--text)]"
    >
        <div
            class="size-16 animate-spin rounded-full border-b-2 border-t-2 border-gray-900 dark:border-white"
        ></div>
    </div>
{:else}
    <PopUp />
{/if}

<style>
    :root {
        --bg: #000000;
        --text: #ffffff;
    }
</style>
