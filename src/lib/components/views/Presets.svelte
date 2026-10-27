<script lang="ts">
    import { onMount } from 'svelte'
    import type { Component } from 'svelte'
    import { storage } from '@wxt-dev/storage'

    import { configStore, MAX_AUDIO_PRESETS, type AudioPreset } from '$lib/stores/config'
    import { playbackStore, effectivePlayback } from '$lib/stores/playback'
    import { effectsStore } from '$lib/stores/effects'
    import { lofiStore } from '$lib/stores/lofi'
    import {
        QUICK_PRESETS,
        QUICK_PRESET_GROUPS,
        activePreset,
        isNormal,
        recipe,
        sameValues,
        sectionsOf,
        type PresetValues,
        type QuickPreset,
        type QuickPresetGroup
    } from '$lib/audio-effects/quick-presets'
    import {
        addPresetSlot,
        lastApplied,
        removeMatchingSlot,
        togglePreset,
        tweakOrigin
    } from '$lib/utils/quick-presets'
    import { presetsSubView } from '$lib/stores/effects-ui'
    import { boundShortcuts, openShortcutSettings } from '$lib/utils/shortcuts'

    import Moon from '@lucide/svelte/icons/moon'
    import FastForward from '@lucide/svelte/icons/fast-forward'
    import Rewind from '@lucide/svelte/icons/rewind'
    import Sun from '@lucide/svelte/icons/sun'
    import AudioWaveform from '@lucide/svelte/icons/audio-waveform'
    import Hourglass from '@lucide/svelte/icons/hourglass'
    import Rabbit from '@lucide/svelte/icons/rabbit'
    import Orbit from '@lucide/svelte/icons/orbit'
    import ChevronsUp from '@lucide/svelte/icons/chevrons-up'
    import ChevronsDown from '@lucide/svelte/icons/chevrons-down'
    import Album from '@lucide/svelte/icons/album'
    import Disc from '@lucide/svelte/icons/disc'
    import LampDesk from '@lucide/svelte/icons/lamp-desk'
    import CloudRain from '@lucide/svelte/icons/cloud-rain'
    import CloudMoon from '@lucide/svelte/icons/cloud-moon'
    import CassetteTape from '@lucide/svelte/icons/cassette-tape'
    import Hotel from '@lucide/svelte/icons/hotel'
    import Ghost from '@lucide/svelte/icons/ghost'
    import Radio from '@lucide/svelte/icons/radio'
    import Headphones from '@lucide/svelte/icons/headphones'
    import Music2 from '@lucide/svelte/icons/music-2'
    import Coffee from '@lucide/svelte/icons/coffee'
    import Zap from '@lucide/svelte/icons/zap'
    import Cloud from '@lucide/svelte/icons/cloud'
    import Sunrise from '@lucide/svelte/icons/sunrise'
    import DoorClosed from '@lucide/svelte/icons/door-closed'
    import Bed from '@lucide/svelte/icons/bed'
    import BatteryLow from '@lucide/svelte/icons/battery-low'
    import Tv from '@lucide/svelte/icons/tv'
    import CloudFog from '@lucide/svelte/icons/cloud-fog'
    import House from '@lucide/svelte/icons/house'
    import Guitar from '@lucide/svelte/icons/guitar'
    import Car from '@lucide/svelte/icons/car'
    import Bath from '@lucide/svelte/icons/bath'
    import Church from '@lucide/svelte/icons/church'
    import PartyPopper from '@lucide/svelte/icons/party-popper'
    import Waves from '@lucide/svelte/icons/waves'
    import Gamepad2 from '@lucide/svelte/icons/gamepad-2'
    import Phone from '@lucide/svelte/icons/phone'
    import Speaker from '@lucide/svelte/icons/speaker'
    import AudioLines from '@lucide/svelte/icons/audio-lines'
    import Podcast from '@lucide/svelte/icons/podcast'
    import MicOff from '@lucide/svelte/icons/mic-off'
    import Mic from '@lucide/svelte/icons/mic'
    import Music from '@lucide/svelte/icons/music'
    import Sparkles from '@lucide/svelte/icons/sparkles'
    import Wind from '@lucide/svelte/icons/wind'
    import Snail from '@lucide/svelte/icons/snail'
    import Skull from '@lucide/svelte/icons/skull'
    import Flame from '@lucide/svelte/icons/flame'
    import CarFront from '@lucide/svelte/icons/car-front'
    import Footprints from '@lucide/svelte/icons/footprints'
    import Droplets from '@lucide/svelte/icons/droplets'
    import TrainFront from '@lucide/svelte/icons/train-front'
    import Mountain from '@lucide/svelte/icons/mountain'
    import SunDim from '@lucide/svelte/icons/sun-dim'
    import Volume1 from '@lucide/svelte/icons/volume-1'
    import MoonStar from '@lucide/svelte/icons/moon-star'
    import NotebookPen from '@lucide/svelte/icons/notebook-pen'
    import Activity from '@lucide/svelte/icons/activity'
    import Piano from '@lucide/svelte/icons/piano'
    import Star from '@lucide/svelte/icons/star'
    import Pencil from '@lucide/svelte/icons/pencil'
    import Plus from '@lucide/svelte/icons/plus'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal'

    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import Texture from '$lib/components/views/Texture.svelte'
    import { cn } from '$lib/utils.js'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    type Group = QuickPresetGroup | 'mine'
    const GROUP_KEY = 'local:chorus_preset_group'

    const ICONS: Record<string, Component> = {
        moon: Moon,
        'fast-forward': FastForward,
        rewind: Rewind,
        sun: Sun,
        'audio-waveform': AudioWaveform,
        hourglass: Hourglass,
        rabbit: Rabbit,
        orbit: Orbit,
        'chevrons-up': ChevronsUp,
        'chevrons-down': ChevronsDown,
        album: Album,
        disc: Disc,
        'lamp-desk': LampDesk,
        'cloud-rain': CloudRain,
        'cloud-moon': CloudMoon,
        'cassette-tape': CassetteTape,
        hotel: Hotel,
        ghost: Ghost,
        radio: Radio,
        headphones: Headphones,
        'music-2': Music2,
        coffee: Coffee,
        zap: Zap,
        cloud: Cloud,
        sunrise: Sunrise,
        'door-closed': DoorClosed,
        bed: Bed,
        'battery-low': BatteryLow,
        tv: Tv,
        'cloud-fog': CloudFog,
        house: House,
        guitar: Guitar,
        car: Car,
        bath: Bath,
        church: Church,
        'party-popper': PartyPopper,
        waves: Waves,
        'gamepad-2': Gamepad2,
        phone: Phone,
        speaker: Speaker,
        'audio-lines': AudioLines,
        podcast: Podcast,
        'mic-off': MicOff,
        mic: Mic,
        music: Music,
        sparkles: Sparkles,
        wind: Wind,
        snail: Snail,
        skull: Skull,
        flame: Flame,
        'car-front': CarFront,
        footprints: Footprints,
        droplets: Droplets,
        'train-front': TrainFront,
        mountain: Mountain,
        'sun-dim': SunDim,
        'volume-1': Volume1,
        'moon-star': MoonStar,
        'notebook-pen': NotebookPen,
        activity: Activity,
        piano: Piano
    }

    let group = $state<Group>('lofi')
    let shortcuts = $state<Record<string, string>>({})
    // One-line confirmation shown in place of the status for a moment.
    let notice = $state('')
    let noticeTimer: ReturnType<typeof setTimeout> | null = null
    let editingId = $state<string | null>(null)
    let draftName = $state('')

    // What is playing right now, read from the same stores the other tabs edit,
    // so the active card can never disagree with them.
    const current = $derived<PresetValues>({
        playback: effectivePlayback($playbackStore),
        effect: $effectsStore,
        lofi: $lofiStore
    })
    const hidden = $derived($configStore.fx_eq_presets.quick_presets ?? [])
    const builtIns = $derived(QUICK_PRESETS.filter((p) => !hidden.includes(p.id)))
    const mine = $derived($configStore.audio_presets)
    const active = $derived(activePreset(current, [...QUICK_PRESETS, ...mine], $lastApplied))
    const normal = $derived(isNormal(current))
    // The tab is named Presets, so the line needs no prefix: the name playing,
    // "tweaked from" it, "Custom" for a sound built by hand, or "Off".
    const statusName = $derived(active ? active.name : normal ? 'Off' : 'Custom')
    const tweakedFrom = $derived($tweakOrigin?.preset.name ?? null)
    /** A built-in is "in Mine" while one of the slots sounds the same as it. */
    const kept = (preset: QuickPreset) => mine.some((p) => sameValues(p, preset))
    /** A toast with the key combo bound to slot N, when there is one. */
    const withCombo = (text: string, slot: number) => {
        const combo = shortcuts[`audio-preset-${slot}`] ?? ''
        return combo ? `${text} · ${combo}` : text
    }

    const sections = $derived(group === 'mine' ? [] : sectionsOf(group, builtIns))
    const visibleCount = $derived(sections.reduce((n, s) => n + s.presets.length, 0))
    const slotsLeft = $derived(MAX_AUDIO_PRESETS - mine.length)

    const options = $derived([
        ...QUICK_PRESET_GROUPS.map((g) => ({ label: g.label, value: g.id })),
        { label: 'Mine', value: 'mine', hint: mine.length ? String(mine.length) : undefined }
    ])

    const openRack = () => presetsSubView.set('rack')

    async function setGroup(value: string) {
        group = value as Group
        await storage.setItem(GROUP_KEY, group)
    }

    function say(text: string) {
        notice = text
        if (noticeTimer) clearTimeout(noticeTimer)
        noticeTimer = setTimeout(() => (notice = ''), 2500)
    }

    async function addSlot(values: PresetValues, name: string) {
        if ((await addPresetSlot(values, name)) === null) {
            say('All five slots are used · remove one in Mine first')
            return false
        }
        return true
    }

    async function saveCurrent() {
        if (normal) return
        const slot = mine.length + 1
        const name = active?.name ?? `Preset ${slot}`
        if (await addSlot(current, name)) say(withCombo(`Saved to Mine as ${name}`, slot))
    }

    /** The star: a copy of the built-in into Mine, or that copy out again. */
    async function toggleKept(preset: QuickPreset) {
        if (kept(preset)) {
            const removed = await removeMatchingSlot(preset)
            if (removed) say(`${removed.name} removed from Mine`)
            return
        }
        const slot = mine.length + 1
        if (await addSlot(preset, preset.name)) say(withCombo(`${preset.name} added to Mine`, slot))
    }

    async function remove(preset: AudioPreset) {
        await configStore.updateConfig({ audio_presets: mine.filter((p) => p.id !== preset.id) })
    }

    function startRename(preset: AudioPreset) {
        editingId = preset.id
        draftName = preset.name
    }

    async function commitRename() {
        const name = draftName.trim()
        const id = editingId
        editingId = null
        if (!id || !name) return
        await configStore.updateConfig({
            audio_presets: mine.map((p) => (p.id === id ? { ...p, name } : p))
        })
    }

    const focusAndSelect = (node: HTMLInputElement) => {
        node.focus()
        node.select()
    }

    onMount(() => {
        storage.getItem<Group>(GROUP_KEY).then((saved) => {
            if (saved && (saved === 'mine' || QUICK_PRESET_GROUPS.some((g) => g.id === saved)))
                group = saved
        })
        boundShortcuts().then((bound) => (shortcuts = bound))
        return () => {
            if (noticeTimer) clearTimeout(noticeTimer)
            // Leaving the tab leaves the rack too; it opens on the cards next time.
            presetsSubView.set('cards')
        }
    })
</script>

{#if $presetsSubView === 'rack'}
    <Texture onBack={() => presetsSubView.set('cards')} />
{:else}
    <div class="flex h-full flex-col gap-y-2.5">
        <div class="flex items-center justify-between gap-x-2">
            <div class="flex min-w-0 items-center gap-x-2 text-xs text-ink-fg-2">
                <span class="led {active || !normal ? '' : 'led-off'}"></span>
                {#if notice}
                    <span class="truncate text-amber">{notice}</span>
                {:else}
                    <span class="truncate">
                        {#if tweakedFrom}
                            tweaked from <span class="font-medium text-ink-fg">{tweakedFrom}</span>
                        {:else}
                            <span class="font-medium text-ink-fg">{statusName}</span>
                        {/if}
                    </span>
                {/if}
                <button
                    type="button"
                    onclick={openRack}
                    aria-label="Tweak the texture"
                    title="Tweak the texture: low-pass, tape, reverb and the rest, knob by knob"
                    class="chorus-focus inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-fg"
                >
                    <SlidersHorizontal class="size-3.5" />
                </button>
            </div>
            <SegmentedControl
                size="xs"
                ariaLabel="Preset group"
                value={group}
                onValueChange={setGroup}
                {options}
            />
        </div>

        {#if group !== 'mine'}
            {#if visibleCount === 0}
                <p class="py-8 text-center text-xs text-ink-muted">
                    Every preset in this group is hidden. Bring them back under Settings → Hidden
                    presets.
                </p>
            {/if}
            {#each sections as section (section.title ?? '')}
                <div class="flex flex-col gap-y-1.5">
                    {#if section.title}
                        <span class="rack-label">{section.title}</span>
                    {/if}
                    <div class="grid grid-cols-2 gap-1.5">
                        {#each section.presets as preset (preset.id)}
                            {@const on = sameValues(current, preset)}
                            {@const Icon = ICONS[preset.icon] ?? Sparkles}
                            {@const chips = recipe(preset).join(' · ')}
                            {@const inMine = kept(preset)}
                            <div
                                class={cn(
                                    'group relative flex h-14 flex-col justify-center gap-y-1 rounded-lg border px-2.5 transition-colors',
                                    on
                                        ? 'border-signal bg-signal/[0.08]'
                                        : 'border-hairline bg-panel hover:bg-surface-2'
                                )}
                            >
                                <button
                                    type="button"
                                    aria-pressed={on}
                                    title={on
                                        ? `${preset.name} · tap to turn off`
                                        : `${preset.description}\n${chips}`}
                                    onclick={() => togglePreset(preset)}
                                    class="chorus-focus absolute inset-0 rounded-lg"
                                >
                                    <span class="sr-only">{preset.name}</span>
                                </button>
                                <span
                                    class="pointer-events-none flex items-center gap-x-1.5 text-xs font-medium leading-none text-ink-fg"
                                >
                                    <Icon
                                        class={cn(
                                            'size-3.5 shrink-0',
                                            on ? 'text-signal' : 'text-ink-muted'
                                        )}
                                    />
                                    <span class="truncate">{preset.name}</span>
                                    {#if on}
                                        <span class="led" aria-label="active"></span>
                                    {/if}
                                </span>
                                <span
                                    class={cn(
                                        'pointer-events-none truncate font-mono text-[10px] leading-3 text-ink-muted',
                                        on ? 'pr-10' : 'pr-5'
                                    )}>{chips}</span
                                >
                                {#if on}
                                    <button
                                        type="button"
                                        aria-label={`Tweak ${preset.name}`}
                                        title="Tweak the texture"
                                        onclick={openRack}
                                        class="chorus-focus absolute bottom-1 right-6 inline-flex size-5 items-center justify-center rounded text-signal transition-colors hover:bg-surface"
                                    >
                                        <SlidersHorizontal class="size-3" />
                                    </button>
                                {/if}
                                <button
                                    type="button"
                                    aria-pressed={inMine}
                                    aria-label={inMine
                                        ? `Remove ${preset.name} from Mine`
                                        : `Add ${preset.name} to Mine`}
                                    title={inMine ? 'In Mine · tap to remove' : 'Add to Mine'}
                                    onclick={() => toggleKept(preset)}
                                    class={cn(
                                        'chorus-focus absolute bottom-1 right-1 inline-flex size-5 items-center justify-center rounded transition-opacity hover:bg-surface focus-visible:opacity-100 group-hover:opacity-100',
                                        inMine
                                            ? 'text-amber'
                                            : 'text-ink-muted opacity-0 hover:text-ink-fg'
                                    )}
                                >
                                    <Star class={cn('size-3', inMine && 'fill-current')} />
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        {:else}
            <div class="flex min-h-0 flex-1 flex-col gap-y-1.5">
                <div class="grid grid-cols-2 gap-1.5">
                    {#each mine as preset, index (preset.id)}
                        {@const on = sameValues(current, preset)}
                        {@const combo = shortcuts[`audio-preset-${index + 1}`] ?? ''}
                        {@const editing = editingId === preset.id}
                        {@const chips = recipe(preset).join(' · ')}
                        {@const Icon =
                            ICONS[QUICK_PRESETS.find((p) => sameValues(p, preset))?.icon ?? ''] ??
                            Star}
                        <div
                            class={cn(
                                'group relative flex h-14 flex-col justify-center gap-y-1 rounded-lg border px-2.5 transition-colors',
                                on
                                    ? 'border-signal bg-signal/[0.08]'
                                    : 'border-hairline bg-panel hover:bg-surface-2'
                            )}
                        >
                            {#if !editing}
                                <button
                                    type="button"
                                    aria-pressed={on}
                                    title={on ? `${preset.name} · tap to turn off` : chips}
                                    onclick={() => togglePreset(preset)}
                                    class="chorus-focus absolute inset-0 rounded-lg"
                                >
                                    <span class="sr-only">{preset.name}</span>
                                </button>
                            {/if}
                            <span
                                class="pointer-events-none flex items-center gap-x-1.5 text-xs font-medium leading-none text-ink-fg"
                            >
                                {#if editing}
                                    <input
                                        type="text"
                                        aria-label="Preset name"
                                        maxlength="24"
                                        bind:value={draftName}
                                        use:focusAndSelect
                                        onblur={commitRename}
                                        onkeydown={(e) => {
                                            if (e.key === 'Enter') commitRename()
                                            if (e.key === 'Escape') editingId = null
                                        }}
                                        class="readout pointer-events-auto relative z-10 h-6 w-full min-w-0 px-2 text-xs focus-visible:border-signal/60 focus-visible:outline-none"
                                    />
                                {:else}
                                    <Icon
                                        class={cn(
                                            'size-3.5 shrink-0',
                                            on ? 'text-signal' : 'text-ink-muted'
                                        )}
                                    />
                                    <span class="min-w-0 truncate">{preset.name}</span>
                                    {#if on}
                                        <span class="led" aria-label="active"></span>
                                    {/if}
                                    {#if combo}
                                        <span
                                            class="ml-auto flex shrink-0 items-center gap-x-0.5"
                                            aria-label={`Shortcut ${combo}`}
                                        >
                                            <kbd
                                                class="rounded border border-hairline-strong bg-surface px-1 py-0.5 font-mono text-[9px] leading-none text-ink-fg-2"
                                                >{combo}</kbd
                                            >
                                        </span>
                                    {/if}
                                {/if}
                            </span>
                            <span
                                class={cn(
                                    'pointer-events-none truncate font-mono text-[10px] leading-3 text-ink-muted',
                                    on ? 'pr-16' : 'pr-10'
                                )}>{chips}</span
                            >
                            {#if on}
                                <button
                                    type="button"
                                    aria-label={`Tweak ${preset.name}`}
                                    title="Tweak the texture"
                                    onclick={openRack}
                                    class="chorus-focus absolute bottom-1 right-11 inline-flex size-5 items-center justify-center rounded text-signal transition-colors hover:bg-surface"
                                >
                                    <SlidersHorizontal class="size-3" />
                                </button>
                            {/if}
                            <span
                                class="absolute bottom-1 right-1 flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                            >
                                <button
                                    type="button"
                                    aria-label={`Rename ${preset.name}`}
                                    title="Rename"
                                    onclick={() => startRename(preset)}
                                    class="chorus-focus inline-flex size-5 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink-fg"
                                >
                                    <Pencil class="size-3" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Remove ${preset.name}`}
                                    title="Remove from Mine"
                                    onclick={() => remove(preset)}
                                    class="chorus-focus inline-flex size-5 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-alarm"
                                >
                                    <Trash2 class="size-3" />
                                </button>
                            </span>
                        </div>
                    {/each}

                    {#if slotsLeft > 0}
                        <button
                            type="button"
                            onclick={saveCurrent}
                            disabled={normal}
                            title={normal
                                ? 'Nothing is on. Tap a preset or move a knob first.'
                                : 'Save the current rate, pitch, key, reverb, EQ, stereo and texture as a slot'}
                            class="chorus-focus flex h-14 flex-col items-center justify-center gap-y-1 rounded-lg border border-dashed border-hairline-strong text-xs text-ink-muted transition-colors enabled:hover:border-signal/50 enabled:hover:text-ink-fg disabled:opacity-50"
                        >
                            <span class="flex items-center gap-x-1.5">
                                <Plus class="size-3.5" />
                                Save what's playing
                            </span>
                            <span class="font-mono text-[10px] text-ink-dim"
                                >as Preset {mine.length + 1} · {slotsLeft}
                                {slotsLeft === 1 ? 'slot' : 'slots'} left</span
                            >
                        </button>
                    {/if}
                </div>

                <div
                    class="mt-auto flex items-center justify-between gap-x-3 pt-1 text-[11px] text-ink-muted"
                >
                    <span>
                        {#if mine.length === 0}
                            Star a preset, or save what's playing, to keep it here. Each slot also
                            gets a keyboard shortcut.
                        {:else}
                            Each slot has a keyboard shortcut. Press it again to turn it off.
                        {/if}
                    </span>
                    <button
                        type="button"
                        onclick={openShortcutSettings}
                        class="chorus-focus inline-flex shrink-0 items-center gap-x-1 rounded-md px-1 text-amber hover:underline"
                    >
                        Edit shortcuts
                        <ExternalLink class="size-3" />
                    </button>
                </div>
            </div>
        {/if}
    </div>
{/if}
