<script lang="ts">
    import { onMount } from 'svelte'
    import type { Component } from 'svelte'
    import { storage } from '@wxt-dev/storage'

    import * as Tabs from '$lib/components/ui/tabs'
    import * as Tooltip from '$lib/components/ui/tooltip'

    import Pin from '@lucide/svelte/icons/pin'
    import Play from '@lucide/svelte/icons/play'
    import Gauge from '@lucide/svelte/icons/gauge'
    import Waves from '@lucide/svelte/icons/waves'
    import Scissors from '@lucide/svelte/icons/scissors'
    import Settings from '@lucide/svelte/icons/settings'
    import Sparkles from '@lucide/svelte/icons/sparkles'
    import FastForward from '@lucide/svelte/icons/fast-forward'
    import MoveHorizontal from '@lucide/svelte/icons/move-horizontal'
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal'

    import ReverbView from '$lib/components/views/ReverbView.svelte'
    import EQView from '$lib/components/views/EQView.svelte'
    import Snip from '$lib/components/views/Snip.svelte'
    import Seek from '$lib/components/views/Seek.svelte'
    import Speed from '$lib/components/views/Speed.svelte'
    import PopUp from '$lib/components/views/PopUp.svelte'
    import MSView from '$lib/components/views/MSView.svelte'
    import Presets from '$lib/components/views/Presets.svelte'
    import Logo from '$lib/components/Logo.svelte'
    import SettingsInfo from '$lib/components/views/SettingsInfo.svelte'
    import ActionButtons from '$lib/components/ActionButtons.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    import { dataStore } from '$lib/stores/data'
    import { snipStore } from '$lib/stores/snip'
    import { configStore } from '$lib/stores/config'
    import { effectsStore } from '$lib/stores/effects'
    import { lofiStore } from '$lib/stores/lofi'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore, effectivePlayback } from '$lib/stores/playback'
    import { settingsStore } from '$lib/stores/settings'
    import { QUICK_PRESETS, matchPreset } from '$lib/audio-effects/quick-presets'
    import { hasLofiEffects } from '$lib/audio-effects/lofi-rack'
    import { volumeStore, type VolumeType } from '$lib/stores/volume'
    import { getVersion } from '$lib/utils/version'
    import { cn } from '$lib/utils.js'

    let { pip = false, initialTab }: { pip?: boolean; initialTab?: string } = $props()

    const version = getVersion()
    const VIEW_KEY = 'local:chorus_view'

    type TabMeta = { id: string; label: string; icon: Component }
    const TAB_META: TabMeta[] = [
        { id: 'player', label: 'Player', icon: Play },
        { id: 'presets', label: 'Presets', icon: Sparkles },
        { id: 'snip', label: 'Snip', icon: Scissors },
        { id: 'speed', label: 'Speed', icon: Gauge },
        { id: 'fx', label: 'Reverb', icon: Waves },
        { id: 'eq', label: 'EQ', icon: SlidersHorizontal },
        { id: 'ms', label: 'Stereo', icon: MoveHorizontal },
        { id: 'seek', label: 'Seek', icon: FastForward }
    ]

    const tabs = $derived(
        (pip ? TAB_META : TAB_META.filter((t) => t.id !== 'player')).map((t) => t.id)
    )
    // Tabs the user has switched off in Settings are dropped from the rail.
    const filteredTabs = $derived(
        tabs.filter((tab) => {
            const views = $settingsStore.views
            if (!Object.keys(views).includes(tab)) return true
            return views[tab as keyof typeof views]
        })
    )

    let activeTab = $state<string | undefined>()
    let defaultView = $state<string>('snip')

    const components: Record<string, Component> = {
        presets: Presets,
        snip: Snip,
        fx: ReverbView,
        eq: EQView,
        ms: MSView,
        seek: Seek,
        speed: Speed,
        settings: SettingsInfo,
        player: PopUp
    }

    // Which features currently carry state — shown as an LED on the tab. The
    // texture rack has no tab of its own (it is edited from Presets), so a rack
    // that is on lights Presets even when no card matches.
    const engaged = $derived<Record<string, boolean>>({
        presets:
            Boolean(
                matchPreset(
                    {
                        playback: effectivePlayback($playbackStore),
                        effect: $effectsStore,
                        lofi: $lofiStore
                    },
                    [...QUICK_PRESETS, ...$configStore.audio_presets]
                )
            ) || hasLofiEffects($lofiStore),
        snip: Boolean($nowPlaying?.snip),
        speed: Boolean($nowPlaying?.playback),
        fx: $effectsStore.reverb !== 'none',
        eq: $effectsStore.equalizer !== 'none',
        ms: $effectsStore.msProcessor !== 'none'
    })

    const activeMeta = $derived(TAB_META.find((t) => t.id === activeTab))
    const isDefault = $derived(defaultView === activeTab)

    async function pinDefault() {
        if (!activeTab || activeTab === 'settings') return
        defaultView = activeTab
        await storage.setItem(VIEW_KEY, activeTab)
    }

    function setActiveTab(tab: string | undefined) {
        if (!tab) return
        if (tab === 'snip') setSnip()
        activeTab = tab
    }

    function setSnip() {
        const track = $nowPlaying?.track_id
            ? dataStore.collectionObject[$nowPlaying.track_id]
            : dataStore.collection.find((x) => x.song_id === $nowPlaying.id)

        snipStore.seed(track?.snip, $nowPlaying?.duration ?? 0)
    }

    async function setupSpeed() {
        if ($nowPlaying?.playback) {
            await playbackStore.updatePlayback({
                track: {
                    rate: $nowPlaying.playback.rate,
                    pitch: $nowPlaying.playback.pitch,
                    semitone: $nowPlaying.playback.semitone
                }
            })
        }
    }

    async function getDefaultView() {
        let tab = initialTab ?? (await storage.getItem<string>(VIEW_KEY)) ?? filteredTabs[0]
        // 'fx|eq' was split into separate 'fx' + 'eq' tabs; migrate a stored default.
        if (tab === 'fx|eq') tab = 'eq'
        defaultView = tab == 'player' && !pip ? filteredTabs[0] : tab
        activeTab = defaultView
    }

    async function handleVolumeTypeChange(value: string) {
        await volumeStore.updateVolume({ type: value as VolumeType })
    }

    onMount(() => {
        getDefaultView()
        setupSpeed()
        if (activeTab === 'snip') setSnip()
        if (activeTab === 'speed') setupSpeed()

        return () => {
            snipStore.reset()
        }
    })
</script>

<Tabs.Root value={activeTab} onValueChange={setActiveTab} class="flex h-full w-full flex-col">
    <!-- header: brand + tab rail + settings -->
    <header class="flex h-11 shrink-0 items-center gap-2 border-b border-hairline pl-3 pr-2">
        <Logo size={18} class="shrink-0" />

        <Tabs.List
            aria-label="Chorus views"
            class="h-7 flex-1 justify-start gap-0.5 border-0 bg-transparent p-0"
        >
            {#each filteredTabs as tab (tab)}
                {@const meta = TAB_META.find((t) => t.id === tab)}
                {@const active = activeTab === tab}
                {#if meta}
                    <Tabs.Trigger
                        value={tab}
                        title={meta.label}
                        aria-label={meta.label}
                        class={cn(
                            'relative h-7 gap-1.5 px-2 text-xs data-[state=active]:bg-surface-2',
                            !active && 'w-7 justify-center px-0'
                        )}
                    >
                        <meta.icon class="size-[14px] shrink-0" />
                        {#if active}
                            <span>{meta.label}</span>
                        {/if}
                        {#if engaged[tab]}
                            <span class="led absolute right-1 top-1 size-1" aria-label="active"
                            ></span>
                        {/if}
                    </Tabs.Trigger>
                {/if}
            {/each}
        </Tabs.List>

        <Tabs.Trigger
            value="settings"
            title="Settings"
            aria-label="Settings"
            class="h-7 w-7 justify-center px-0 data-[state=active]:bg-surface-2"
        >
            <Settings class="size-[15px]" />
        </Tabs.Trigger>
    </header>

    {#if activeTab}
        <Tabs.Content
            value={activeTab}
            class="chorus-scroll mt-0 flex min-h-0 flex-1 flex-col gap-y-2.5 overflow-y-auto px-4 pb-2 pt-3"
        >
            {@const View = components[activeTab]}
            <View {pip} />
        </Tabs.Content>

        <!-- footer: default-view pin, context, actions -->
        <footer
            class="flex h-10 shrink-0 items-center justify-between gap-2 border-t border-hairline px-2"
        >
            <div class="flex items-center gap-1.5">
                {#if activeTab === 'settings'}
                    <span class="pl-1 font-mono text-[10px] tracking-wider text-ink-muted"
                        >v{version}</span
                    >
                {:else if activeTab === 'player'}
                    <SegmentedControl
                        size="xs"
                        ariaLabel="Volume curve"
                        value={$volumeStore.type}
                        onValueChange={handleVolumeTypeChange}
                        options={[
                            { label: 'Linear', value: 'linear', title: 'Linear volume curve' },
                            {
                                label: 'Log',
                                value: 'logarithmic',
                                title: 'Logarithmic volume curve'
                            }
                        ]}
                    />
                {:else}
                    <Tooltip.Provider delayDuration={300}>
                        <Tooltip.Root>
                            <Tooltip.Trigger
                                onclick={pinDefault}
                                aria-pressed={isDefault}
                                aria-label="Open this tab first"
                                class={cn(
                                    'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
                                    isDefault
                                        ? 'text-signal-bright'
                                        : 'text-ink-muted hover:bg-surface-2 hover:text-ink-fg'
                                )}
                            >
                                <Pin class={cn('size-3.5', isDefault && 'fill-current')} />
                                <span>{isDefault ? 'Default' : 'Set default'}</span>
                            </Tooltip.Trigger>
                            <Tooltip.Content side="top">
                                {isDefault
                                    ? `${activeMeta?.label ?? 'This tab'} opens first`
                                    : `Open ${activeMeta?.label ?? 'this tab'} first next time`}
                            </Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                {/if}
            </div>

            {#if activeTab !== 'settings'}
                <ActionButtons tab={activeTab} />
            {/if}
        </footer>
    {/if}
</Tabs.Root>
