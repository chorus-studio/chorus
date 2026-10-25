<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'
    import TabsList from '$lib/components/TabsList.svelte'
    import PopUp from '$lib/components/views/PopUp.svelte'
    import PowerOffOverlay from '$lib/components/PowerOffOverlay.svelte'
    import VocalRemovalToggle from '$lib/components/VocalRemovalToggle.svelte'
    import ChorusConfigDialog from '$lib/components/ChorusConfigDialog.svelte'
    import BlockedTracksDialog from '$lib/components/BlockedTracksDialog.svelte'
    import TimeProgress from '$lib/components/TimeProgress.svelte'
    import VolumeSlider from '$lib/components/VolumeSlider.svelte'
    import LoopButton from '$lib/components/LoopButton.svelte'
    import SeekButton from '$lib/components/SeekButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SkipButton from '$lib/components/SkipButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'
    import { applyPalette } from '$lib/utils/vibrant-colors'
    import { STATIC_THEMES, applyThemeVariables, type ThemeName } from '$lib/utils/theming'

    const params = new URLSearchParams(location.search)
    const scene = params.get('scene') ?? 'tabs'
    const tab = params.get('tab') ?? 'snip'
    const dialog = params.get('dialog') ?? ''
    // ?theme=hot_pink tints the rack and paints the page in that theme's chrome.
    const themeConfig = STATIC_THEMES[(params.get('theme') ?? 'spotify') as ThemeName]
    const chrome = themeConfig?.player ?? '#000000'

    onMount(() => {
        document.documentElement.classList.add('dark')
        applyPalette(document.documentElement, { bg_colour: '#1b6b63', text_colour: '#eafff9' })
        if (themeConfig) applyThemeVariables(themeConfig)
    })
</script>

<div class="dark min-h-screen p-6 text-ink-fg" style="background: {chrome}">
    {#if scene === 'tabs'}
        <div
            id="frame"
            class="h-[320px] w-[400px] overflow-hidden rounded-xl border border-hairline-strong bg-ink shadow-float"
        >
            <TabsList initialTab={tab} />
        </div>
    {:else if scene === 'pip'}
        <div
            id="frame"
            class="h-[320px] w-[440px] overflow-hidden rounded-lg border border-hairline-strong bg-ink"
        >
            <TabsList pip initialTab={tab} />
        </div>
    {:else if scene === 'popup'}
        <div id="frame" class="w-[320px] overflow-hidden rounded-lg border border-hairline-strong">
            <PopUp onVoice={() => {}} />
        </div>
    {:else if scene === 'popup-off'}
        <div id="frame" class="w-[320px] overflow-hidden rounded-lg border border-hairline-strong">
            <PowerOffOverlay onenable={() => {}} />
        </div>
    {:else if scene === 'popup-voice'}
        <div
            id="frame"
            class="flex h-[196px] w-[320px] flex-col gap-y-2.5 overflow-hidden rounded-lg border border-hairline-strong bg-ink px-3 pb-3 pt-2"
        >
            <div class="flex h-[26px] items-center justify-between">
                <span class="text-xs text-ink-fg-2">‹ Player</span><span class="rack-label"
                    >Chrome only · on-device</span
                >
            </div>
            <VocalRemovalToggle />
        </div>
    {:else if scene === 'bar'}
        <div
            id="frame"
            class="flex h-[96px] w-[1280px] items-center gap-x-6 px-4 text-white"
            style="background: {chrome}"
        >
            <div class="flex items-center gap-x-3">
                <div class="size-14 rounded bg-surface-2"></div>
                <div class="flex flex-col gap-y-1">
                    <span class="text-sm font-medium">Midnight City</span><span
                        class="text-[11px] text-ink-muted">M83</span
                    >
                </div>
                <div id="chorus-ui" class="dark flex items-center gap-x-0.5">
                    <HeartButton />
                    <SettingsPopover />
                    <SkipButton />
                </div>
            </div>
            <div class="flex max-w-[620px] flex-1 flex-col items-center gap-y-1.5">
                <div class="flex items-center gap-x-1.5">
                    <SeekButton role="seek-backward" />
                    <div class="size-8 rounded-full bg-white"></div>
                    <SeekButton role="seek-forward" />
                    <LoopButton />
                </div>
                <div class="w-full"><TimeProgress id="chorus-time-progress" port={null} /></div>
            </div>
            <div class="flex w-[300px] justify-end"><VolumeSlider port={null} /></div>
        </div>
    {:else if scene === 'dialog'}
        <div id="frame" class="flex items-center gap-x-4 rounded-lg bg-ink p-4">
            {#if dialog === 'blocked'}
                <BlockedTracksDialog open />
            {:else}
                <ChorusConfigDialog open initialTab={dialog || 'auto-skip'} />
            {/if}
        </div>
    {/if}
</div>
