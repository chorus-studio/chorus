<script lang="ts">
    import { onMount } from 'svelte'
    import { getCommandService } from '$lib/utils/command'
    import { type AudioPreset, configStore, createAudioPreset } from '$lib/stores/config'

    import X from '@lucide/svelte/icons/x'
    import Pencil from '@lucide/svelte/icons/pencil'
    import CirclePlus from '@lucide/svelte/icons/circle-plus'
    import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down'

    import { Button } from '$lib/components/ui/button'
    import FXEQPresetInput from './FXEQPresetInput.svelte'
    import { Separator } from '$lib/components/ui/separator'
    import SpeedPresetInput from './SpeedPresetInput.svelte'
    import * as Collapsible from '$lib/components/ui/collapsible'

    let openCollapsible = $state<number | null>(null)

    async function addNewPreset() {
        const audioPreset = createAudioPreset()
        await configStore.updateConfig({
            audio_presets: [...$configStore.audio_presets, audioPreset]
        })
    }

    async function removePreset(preset: AudioPreset) {
        await configStore.updateConfig({
            audio_presets: $configStore.audio_presets.filter((p) => p.id !== preset.id)
        })
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

    let shortcuts: { [key: string]: string } = $state({})
    let shortcutsArr: string[] = $state([])

    async function getShortcuts() {
        const commands = (await getCommandService().getCommands()) as chrome.commands.Command[]
        shortcuts = commands
            .filter((command) => command?.description?.startsWith('Audio Preset'))
            .reduce<{ [key: string]: string }>(
                (acc, command) => ({
                    ...acc,
                    [command.description as string]: command.shortcut || 'setup'
                }),
                {}
            )

        shortcutsArr = Object.keys(shortcuts).map((key) => shortcuts[key])
    }

    function toggleCollapsible(index: number) {
        if (openCollapsible === index) {
            openCollapsible = null
        } else {
            openCollapsible = index
        }
    }

    onMount(() => {
        getShortcuts()
        openCollapsible = null
    })
</script>

<div class="flex flex-col gap-4">
    <div class="flex w-full flex-col gap-2 rounded-md">
        <div class="flex w-full justify-between rounded-md bg-muted p-4">
            <h1>Quick Toggle Presets</h1>
            <p>Set and save your favourite presets for quick toggles.</p>
        </div>

        {#each $configStore.audio_presets as preset, index}
            <Collapsible.Root open={openCollapsible === index}>
                <Collapsible.Trigger
                    class="relative flex w-full items-center gap-x-4 bg-background p-4 {openCollapsible ===
                    index
                        ? 'rounded-t-md'
                        : 'rounded-md'}"
                    onclick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleCollapsible(index)
                    }}
                >
                    <ChevronsUpDown class="size-4" stroke="white" />
                    <p class="text-base">Audio Preset {index + 1}</p>
                    <div class="absolute right-12 flex items-center justify-end gap-x-2">
                        {#if preset.active}
                            <p class="text-xs uppercase text-green-500">active</p>
                        {/if}
                        <kbd class="rounded-sm bg-muted px-2 font-sans text-base tracking-wide">
                            {shortcutsArr[index]}
                        </kbd>
                    </div>

                    <Button
                        size="icon"
                        variant="ghost"
                        onclick={() => removePreset(preset)}
                        class="absolute right-4 z-50 size-5 p-0 [&_svg]:size-4"
                    >
                        <X />
                    </Button>
                </Collapsible.Trigger>
                <Collapsible.Content>
                    <div
                        class="flex w-full justify-between gap-x-2 gap-y-4 rounded-b-md bg-muted p-6"
                    >
                        <div class="flex w-full flex-col gap-4">
                            <div
                                class="flex items-center justify-between gap-2 rounded-md bg-primary-foreground p-4"
                            >
                                <p class="text-base">Audio Preset {index + 1}</p>
                                <div class="flex items-center gap-2">
                                    <kbd
                                        class="rounded-sm bg-muted px-2 font-sans text-base tracking-wide"
                                    >
                                        {shortcutsArr[index]}
                                    </kbd>

                                    <Button
                                        size="sm"
                                        onclick={openShortcutSettings}
                                        class="h-6 cursor-pointer rounded-sm bg-muted text-sm hover:bg-muted [&_svg]:size-4"
                                    >
                                        <Pencil class="stroke-white" />
                                    </Button>
                                </div>
                            </div>
                            <FXEQPresetInput type="reverb" {preset} />
                            <FXEQPresetInput type="equalizer" {preset} />
                        </div>

                        <Separator class="w-0.5" orientation="vertical" />
                        <div class="flex w-full flex-col gap-2">
                            <div class="flex flex-col gap-y-3">
                                <SpeedPresetInput key="rate" {preset} />
                                <SpeedPresetInput key="pitch" {preset} />
                                <SpeedPresetInput key="semitone" {preset} />
                            </div>
                        </div>
                    </div>
                </Collapsible.Content>
            </Collapsible.Root>
        {/each}

        {#if $configStore.audio_presets.length < shortcutsArr.length}
            <Button
                size="lg"
                onclick={addNewPreset}
                class="inline-flex h-16 w-full items-center justify-center bg-background hover:bg-background [&_svg]:size-7"
            >
                <CirclePlus class="stroke-white" />
            </Button>
        {/if}
    </div>
</div>
