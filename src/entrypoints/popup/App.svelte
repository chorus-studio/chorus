<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'

    import { nowPlaying } from '$lib/stores/now-playing'
    import { get } from 'svelte/store'
    import { paintPopup } from '$lib/utils/vibrant-colors'
    import { applyRackLook, watchSystemMode } from '$lib/utils/theming'
    import { getEnabled, setEnabled, watchEnabled } from '$lib/stores/enabled'
    import { settingsStore } from '$lib/stores/settings'

    import Logo from '$lib/components/Logo.svelte'
    import PopUp from '$lib/components/views/PopUp.svelte'
    import PowerOffOverlay from '$lib/components/PowerOffOverlay.svelte'
    import VocalRemovalToggle from '$lib/components/VocalRemovalToggle.svelte'
    import { checkVocalSupport } from '$lib/audio-effects/vocal-model/support'
    import ChevronLeft from '@lucide/svelte/icons/chevron-left'

    let loading = $state(false)
    // undefined until the persisted flag resolves, so we never flash the on-state
    // UI before knowing the extension is off.
    let enabled = $state<boolean | undefined>(undefined)
    // The popup swaps between the player and the vocal-separation UI in the same
    // footprint, so neither makes the popup taller.
    let view = $state<'player' | 'voice'>('player')
    // Only expose vocal separation if this device can actually run it (WebGPU etc).
    let vocalSupported = $state(false)
    // The frames shown before and instead of the player match its height (the
    // glass card adds 8 px of padding), so the popup never resizes.
    const frameHeight = $derived($settingsStore.ui.glass ? 'h-[184px]' : 'h-[176px]')

    // First paint before the player mounts, so the loading frame already wears
    // the cover's colour (or the rack tokens for "Popup: Theme"); PopUp keeps
    // it current from there.
    function loadColours() {
        return paintPopup(document.documentElement, get(settingsStore), $nowPlaying.cover)
    }

    async function init() {
        loading = true
        await loadColours()
        loading = false
    }

    onMount(() => {
        init()
        getEnabled().then((value) => (enabled = value))
        checkVocalSupport().then((s) => {
            vocalSupported = s.supported
            if (!s.supported) console.debug('[chorus] vocal separation unavailable:', s.reason)
        })
        const unwatch = watchEnabled((value) => (enabled = value))

        // Rack tokens (palette, appearance, glass) follow settings; changes made
        // on the page arrive here through storage.
        const unsubscribeLook = settingsStore.subscribe((s) => applyRackLook(s, document))
        const unwatchSystem = watchSystemMode(() => applyRackLook(get(settingsStore), document))

        return () => {
            unwatch()
            unsubscribeLook()
            unwatchSystem()
        }
    })
</script>

{#if enabled === undefined}
    <div class="{frameHeight} w-[320px] bg-[color:var(--bg)]"></div>
{:else if !enabled}
    <PowerOffOverlay frameClass={frameHeight} onenable={() => setEnabled(true)} />
{:else if loading}
    <div
        class="flex {frameHeight} w-[320px] items-center justify-center bg-[color:var(--bg)] text-[color:var(--text)]"
    >
        <Logo size={28} tone="current" class="animate-led-pulse" />
    </div>
{:else if view === 'voice' && vocalSupported}
    <div class="flex {frameHeight} w-[320px] flex-col gap-y-2.5 bg-ink px-3 pb-3 pt-2 text-ink-fg">
        <div class="flex h-[26px] items-center justify-between">
            <button
                type="button"
                onclick={() => (view = 'player')}
                class="chorus-focus inline-flex h-6 items-center gap-x-1 rounded-md pl-0.5 pr-1.5 text-xs text-ink-fg-2 hover:bg-surface-2 hover:text-ink-fg"
            >
                <ChevronLeft class="size-3.5" />
                Player
            </button>
            <span class="rack-label">Chrome only · on-device</span>
        </div>
        <VocalRemovalToggle />
    </div>
{:else}
    <PopUp onVoice={vocalSupported ? () => (view = 'voice') : undefined} />
{/if}

<style>
    :root {
        --bg: #121212;
        --text: #ffffff;
        --text-2: #b3b3b3;
        --album-accent: #1ed760;
    }
</style>
