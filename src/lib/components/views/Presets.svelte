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
        isNormal,
        matchPreset,
        recipe,
        sectionsOf,
        type PresetValues,
        type QuickPreset,
        type QuickPresetGroup
    } from '$lib/audio-effects/quick-presets'
    import { addPresetSlot, applyNormal, lastApplied, togglePreset } from '$lib/utils/quick-presets'
    import { boundShortcuts, openShortcutSettings, shortcutKeys } from '$lib/utils/shortcuts'

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
    import Keyboard from '@lucide/svelte/icons/keyboard'
    import Pencil from '@lucide/svelte/icons/pencil'
    import Plus from '@lucide/svelte/icons/plus'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import ExternalLink from '@lucide/svelte/icons/external-link'

    import { Button } from '$lib/components/ui/button'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
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
        sparkles: Sparkles
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
    const active = $derived(matchPreset(current, [...QUICK_PRESETS, ...mine]))
    const normal = $derived(isNormal(current))
    const statusName = $derived(active ? active.name : normal ? 'off' : 'Custom')
    const tweakedFrom = $derived(!active && !normal ? $lastApplied : null)

    const sections = $derived(group === 'mine' ? [] : sectionsOf(group, builtIns))
    const visibleCount = $derived(sections.reduce((n, s) => n + s.presets.length, 0))
    const slotsLeft = $derived(MAX_AUDIO_PRESETS - mine.length)

    const options = $derived([
        ...QUICK_PRESET_GROUPS.map((g) => ({ label: g.label, value: g.id })),
        { label: 'Mine', value: 'mine', hint: mine.length ? String(mine.length) : undefined }
    ])

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
        if (await addSlot(current, name)) say(`Saved as ${name} · slot ${slot}`)
    }

    async function pinToSlot(preset: QuickPreset) {
        const slot = mine.length + 1
        if (await addSlot(preset, preset.name))
            say(`${preset.name} pinned to slot ${slot} · see Mine`)
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
        }
    })
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <div class="flex items-center justify-between gap-x-2">
        <div class="flex min-w-0 items-center gap-x-2 text-xs text-ink-fg-2">
            <span class="led {active || !normal ? '' : 'led-off'}"></span>
            {#if notice}
                <span class="truncate text-amber">{notice}</span>
            {:else}
                <span class="truncate">
                    Preset · <span class="font-medium text-ink-fg">{statusName}</span>
                    {#if tweakedFrom}
                        <span class="text-ink-muted">· tweaked from {tweakedFrom}</span>
                    {/if}
                </span>
            {/if}
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
                        {@const on = active?.id === preset.id}
                        {@const Icon = ICONS[preset.icon] ?? Sparkles}
                        {@const chips = recipe(preset).join(' · ')}
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
                                class="pointer-events-none truncate pr-5 font-mono text-[10px] leading-3 text-ink-muted"
                                >{chips}</span
                            >
                            <button
                                type="button"
                                aria-label={`Pin ${preset.name} to a shortcut slot`}
                                title="Pin to a shortcut slot"
                                onclick={() => pinToSlot(preset)}
                                class="chorus-focus absolute bottom-1 right-1 inline-flex size-5 items-center justify-center rounded text-ink-muted opacity-0 transition-opacity hover:bg-surface hover:text-ink-fg focus-visible:opacity-100 group-hover:opacity-100"
                            >
                                <Keyboard class="size-3" />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    {:else}
        <div class="flex min-h-0 flex-1 flex-col gap-y-1.5">
            {#each mine as preset, index (preset.id)}
                {@const on = active?.id === preset.id}
                {@const combo = shortcuts[`audio-preset-${index + 1}`] ?? ''}
                {@const editing = editingId === preset.id}
                <div
                    class={cn(
                        'group relative flex h-9 shrink-0 items-center gap-x-2.5 rounded-lg border pl-3 pr-1 transition-colors',
                        on
                            ? 'border-signal bg-signal/[0.08]'
                            : 'border-hairline bg-panel hover:bg-surface-2'
                    )}
                >
                    {#if !editing}
                        <button
                            type="button"
                            aria-pressed={on}
                            title={on
                                ? `${preset.name} · tap to turn off`
                                : recipe(preset).join(' · ')}
                            onclick={() => togglePreset(preset)}
                            class="chorus-focus absolute inset-0 rounded-lg"
                        >
                            <span class="sr-only">{preset.name}</span>
                        </button>
                    {/if}
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
                            class="readout relative z-10 h-6 w-32 px-2 text-xs focus-visible:border-signal/60 focus-visible:outline-none"
                        />
                    {:else}
                        <span
                            class="pointer-events-none flex shrink-0 items-center gap-x-1.5 text-xs font-medium text-ink-fg"
                        >
                            <span class="max-w-32 truncate">{preset.name}</span>
                            {#if on}
                                <span class="led" aria-label="active"></span>
                            {/if}
                        </span>
                    {/if}
                    <span
                        class="pointer-events-none flex min-w-0 flex-1 items-center gap-x-1 overflow-hidden [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)]"
                    >
                        {#each recipe(preset) as chip (chip)}
                            <span
                                class="inline-flex h-[18px] shrink-0 items-center rounded-[4px] border border-hairline bg-surface px-1.5 font-mono text-[10px] text-ink-fg-2"
                                >{chip}</span
                            >
                        {/each}
                    </span>
                    {#if combo}
                        <span
                            class="pointer-events-none flex shrink-0 items-center gap-x-0.5"
                            aria-label={`Shortcut ${combo}`}
                        >
                            {#each shortcutKeys(combo) as key (key)}
                                <kbd
                                    class="rounded border border-hairline-strong bg-surface px-1 py-0.5 font-mono text-[10px] leading-none text-ink-fg-2"
                                    >{key}</kbd
                                >
                            {/each}
                        </span>
                    {/if}
                    <span
                        class="relative z-10 flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                    >
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Rename ${preset.name}`}
                            title="Rename"
                            onclick={() => startRename(preset)}
                        >
                            <Pencil class="size-3" />
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Remove ${preset.name}`}
                            title="Remove"
                            onclick={() => remove(preset)}
                            class="hover:text-alarm"
                        >
                            <Trash2 class="size-3" />
                        </Button>
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
                    class="chorus-focus flex h-9 w-full shrink-0 items-center justify-center gap-x-2 rounded-lg border border-dashed border-hairline-strong text-xs text-ink-muted transition-colors enabled:hover:border-signal/50 enabled:hover:text-ink-fg disabled:opacity-50"
                >
                    <Plus class="size-3.5" />
                    Save what's playing as Preset {mine.length + 1}
                    <span class="font-mono text-[10px] text-ink-dim"
                        >· {slotsLeft} {slotsLeft === 1 ? 'slot' : 'slots'} left</span
                    >
                </button>
            {/if}

            <div
                class="mt-auto flex items-center justify-between gap-x-3 pt-1 text-[11px] text-ink-muted"
            >
                <span>
                    {#if mine.length === 0}
                        Tap a preset, tweak it in the other tabs, then save what's playing.
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
