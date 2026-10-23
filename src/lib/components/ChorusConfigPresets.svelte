<script lang="ts">
    import { onMount } from 'svelte'
    import { getCommandService } from '$lib/utils/command'
    import { type AudioPreset, configStore, createAudioPreset } from '$lib/stores/config'
    import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'

    import Plus from '@lucide/svelte/icons/plus'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import Keyboard from '@lucide/svelte/icons/keyboard'
    import ChevronRight from '@lucide/svelte/icons/chevron-right'
    import ExternalLink from '@lucide/svelte/icons/external-link'

    import { Button } from '$lib/components/ui/button'
    import FXEQPresetInput from './FXEQPresetInput.svelte'
    import SpeedPresetInput from './SpeedPresetInput.svelte'
    import * as Collapsible from '$lib/components/ui/collapsible'
    import { cn } from '$lib/utils.js'

    const MAX_PRESETS = 5
    let openIndex = $state<number | null>(null)

    async function addNewPreset() {
        const audioPreset = createAudioPreset()
        await configStore.updateConfig({
            audio_presets: [...$configStore.audio_presets, audioPreset]
        })
        openIndex = $configStore.audio_presets.length - 1
    }

    async function removePreset(preset: AudioPreset) {
        await configStore.updateConfig({
            audio_presets: $configStore.audio_presets.filter((p) => p.id !== preset.id)
        })
        openIndex = null
    }

    function getBrowser() {
        const userAgent = navigator.userAgent
        if (userAgent.includes('Edg')) return 'edge'
        if (userAgent.includes('Chrome')) return 'chrome'
        if (userAgent.includes('Firefox')) return 'firefox'
        return 'chrome'
    }

    async function openShortcutSettings() {
        const browser = getBrowser()
        const url = browser == 'firefox' ? 'about:addons' : `${browser}://extensions/shortcuts`
        await getCommandService().openShortcutSettings(url)
    }

    let shortcuts = $state<string[]>([])

    async function getShortcuts() {
        const commands = (await getCommandService().getCommands()) as chrome.commands.Command[]
        shortcuts = commands
            .filter((command) => command?.description?.startsWith('Audio Preset'))
            .sort((a, b) => (a.description ?? '').localeCompare(b.description ?? ''))
            .map((command) => command.shortcut || '')
    }

    function toggle(index: number) {
        openIndex = openIndex === index ? null : index
    }

    // One-line summary for a collapsed preset: non-default values only.
    function summary(preset: AudioPreset): string[] {
        const out: string[] = []
        const { rate, pitch, semitone } = preset.playback
        if (rate.value !== 1) out.push(`${rate.value}×`)
        if (pitch !== 1) out.push(`pitch ${pitch}`)
        if (semitone !== 0) out.push(`${semitone > 0 ? '+' : ''}${semitone} st`)
        const reverb = resolveReverbPreset(preset.effect.reverb)
        if (reverb && reverb !== 'none') out.push(reverb)
        if (preset.effect.equalizer !== 'none') out.push(preset.effect.equalizer)
        return out
    }

    const keys = (combo: string) =>
        combo
            .split('+')
            .map((k) => k.trim())
            .filter(Boolean)
    const slotsLeft = $derived(MAX_PRESETS - $configStore.audio_presets.length)

    onMount(() => {
        getShortcuts()
        openIndex = null
    })
</script>

<div class="flex flex-col gap-y-2.5">
    <div class="mb-1 flex items-start justify-between gap-x-4">
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[13px] font-medium text-ink-fg">Quick-toggle presets</span>
            <span class="text-xs text-ink-muted">
                Up to five combinations of speed, pitch, key, reverb and EQ, each on its own
                keyboard shortcut. Press it again to turn the preset off.
            </span>
        </div>
        <Button variant="outline" size="sm" onclick={openShortcutSettings} class="shrink-0">
            <Keyboard class="size-3.5" />
            Edit shortcuts
        </Button>
    </div>

    {#each $configStore.audio_presets as preset, index (preset.id)}
        {@const open = openIndex === index}
        {@const combo = shortcuts[index]}
        {@const chips = summary(preset)}
        <Collapsible.Root {open} class="rounded-lg border border-hairline bg-panel">
            <div
                class="flex min-h-12 items-center gap-x-3 px-3.5 py-2.5 {open
                    ? 'border-b border-hairline'
                    : ''}"
            >
                <Collapsible.Trigger
                    onclick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggle(index)
                    }}
                    aria-label={`${open ? 'Collapse' : 'Expand'} preset ${index + 1}`}
                    class="chorus-focus inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink-fg"
                >
                    <ChevronRight class={cn('size-4 transition-transform', open && 'rotate-90')} />
                </Collapsible.Trigger>
                <span class="text-[13px] font-medium text-ink-fg">Preset {index + 1}</span>
                {#if preset.active}
                    <span class="flex items-center gap-x-1.5 text-[11px] text-signal">
                        <span class="led"></span>Active
                    </span>
                {/if}
                {#if !open && chips.length}
                    <span class="flex flex-wrap items-center gap-1">
                        {#each chips as chip (chip)}
                            <span
                                class="inline-flex h-5 items-center rounded-[5px] border border-hairline bg-surface px-1.5 font-mono text-[11px] text-ink-fg-2"
                                >{chip}</span
                            >
                        {/each}
                    </span>
                {/if}
                <span class="flex-1"></span>
                {#if combo}
                    <span class="flex items-center gap-x-1">
                        {#each keys(combo) as key (key)}
                            <kbd
                                class="rounded border border-hairline-strong bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-fg-2"
                                >{key}</kbd
                            >
                        {/each}
                    </span>
                {:else}
                    <button
                        type="button"
                        onclick={openShortcutSettings}
                        class="chorus-focus inline-flex items-center gap-x-1 rounded-md px-1 text-[11px] text-amber hover:underline"
                    >
                        No shortcut yet — set one
                        <ExternalLink class="size-3" />
                    </button>
                {/if}
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove preset ${index + 1}`}
                    onclick={() => removePreset(preset)}
                    class="hover:text-alarm"
                >
                    <Trash2 class="size-3.5" />
                </Button>
            </div>

            <Collapsible.Content>
                <div class="grid grid-cols-2 gap-x-8 px-4 pb-4 pt-3">
                    <div class="flex flex-col gap-y-1.5">
                        <span class="rack-label">Effects</span>
                        <FXEQPresetInput type="reverb" {preset} />
                        <FXEQPresetInput type="equalizer" {preset} />
                        <span class="text-[11px] text-ink-dim"
                            >Lists follow your hidden-preset choices</span
                        >
                    </div>
                    <div class="flex flex-col gap-y-1.5">
                        <span class="rack-label">Playback</span>
                        <SpeedPresetInput key="rate" {preset} />
                        <SpeedPresetInput key="pitch" {preset} />
                        <SpeedPresetInput key="semitone" {preset} />
                    </div>
                </div>
            </Collapsible.Content>
        </Collapsible.Root>
    {/each}

    {#if slotsLeft > 0}
        <button
            type="button"
            onclick={addNewPreset}
            class="chorus-focus flex h-11 w-full items-center justify-center gap-x-2 rounded-lg border border-dashed border-hairline-strong text-xs text-ink-muted transition-colors hover:border-signal/50 hover:text-ink-fg"
        >
            <Plus class="size-4" />
            Add preset · {slotsLeft}
            {slotsLeft === 1 ? 'slot' : 'slots'} left
        </button>
    {/if}
</div>
