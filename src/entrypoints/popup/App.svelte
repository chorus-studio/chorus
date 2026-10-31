<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'

    import { nowPlaying } from '$lib/stores/now-playing'
    import { get } from 'svelte/store'
    import { paintPopup } from '$lib/utils/vibrant-colors'
    import { applyRackLook, watchSystemMode } from '$lib/utils/theming'
    import { followPlayingCover } from '$lib/utils/cover-palette'
    import { getEnabled, setEnabled, watchEnabled } from '$lib/stores/enabled'
    import { settingsStore } from '$lib/stores/settings'
    import { looksStore } from '$lib/stores/looks'

    import Logo from '$lib/components/Logo.svelte'
    import PopUp from '$lib/components/views/PopUp.svelte'
    import PowerOffOverlay from '$lib/components/PowerOffOverlay.svelte'
    import VocalRemovalToggle from '$lib/components/VocalRemovalToggle.svelte'
    import PopupSubview from '$lib/components/PopupSubview.svelte'
    import { checkVocalSupport } from '$lib/audio-effects/vocal-model/support'
    import { syncNotificationPermission } from '$lib/utils/notification-permission'

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
        // Chrome's permission prompt closes the popup, so a grant is read back here.
        syncNotificationPermission()
        getEnabled().then((value) => (enabled = value))
        checkVocalSupport().then((s) => {
            vocalSupported = s.supported
            if (!s.supported) console.debug('[chorus] vocal separation unavailable:', s.reason)
        })
        const unwatch = watchEnabled((value) => (enabled = value))

        // Rack tokens (palette, appearance, glass) follow settings; changes made
        // on the page arrive here through storage.
        const repaint = () => applyRackLook(get(settingsStore), document, get(looksStore))
        const unsubscribeLook = settingsStore.subscribe(repaint)
        const unsubscribeLooks = looksStore.subscribe(repaint)
        const unwatchSystem = watchSystemMode(repaint)
        // A look whose palette follows the cover needs the cover here too.
        const unsubscribeCover = nowPlaying.subscribe(
            (n) => void followPlayingCover(n.cover ?? null)
        )

        return () => {
            unwatch()
            unsubscribeLook()
            unsubscribeLooks()
            unwatchSystem()
            unsubscribeCover()
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
    <PopupSubview
        frameClass={frameHeight}
        label="Chrome only · on-device"
        onback={() => (view = 'player')}
    >
        <VocalRemovalToggle />
    </PopupSubview>
{:else}
    <PopUp onVoice={vocalSupported ? () => (view = 'voice') : undefined} />
{/if}

<style>
    :root {
        --bg: #121212;
        --text: #ffffff;
        --text-2: #b3b3b3;
        --album-accent: #1ed760;
        --album-accent-fg: #000000;
    }
</style>
