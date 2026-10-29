<script lang="ts">
    import * as Tabs from '$lib/components/ui/tabs'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'
    import Logo from '$lib/components/Logo.svelte'
    import Settings2 from '@lucide/svelte/icons/settings-2'

    import ChorusConfigFXEQ from './ChorusConfigFXEQ.svelte'
    import ChorusConfigTheming from './ChorusConfigTheming.svelte'
    import ChorusConfigShortcuts from './ChorusConfigShortcuts.svelte'
    import ChorusConfigAutoSkip from './ChorusConfigAutoSkip.svelte'
    import ChorusConfigAudio from './ChorusConfigAudio.svelte'

    let { open = false, initialTab = 'auto-skip' }: { open?: boolean; initialTab?: string } =
        $props()
    let activeTab = $state(initialTab)

    const TABS = [
        { id: 'auto-skip', label: 'Auto-skip' },
        { id: 'shortcuts', label: 'Shortcuts' },
        { id: 'fx-eq', label: 'Hidden presets' },
        { id: 'audio', label: 'Audio' },
        { id: 'theming', label: 'Theme' }
    ]
</script>

<Dialog.Root bind:open>
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                    <Dialog.Trigger
                        {...tooltipProps}
                        id="chorus-config-dialog-trigger"
                        aria-label="Chorus settings"
                        class={buttonVariants({
                            variant: 'bar',
                            size: 'icon-sm',
                            class: '[&_svg]:size-[18px]'
                        })}
                    >
                        <Settings2 />
                    </Dialog.Trigger>
                {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">Chorus settings</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Dialog.Content
        id="chorus-config-dialog-content"
        class="flex h-[600px] max-h-[90vh] w-[760px] max-w-[92vw] flex-col gap-0 overflow-hidden p-0"
    >
        <div class="flex items-start justify-between px-6 pb-3.5 pt-5">
            <div class="flex items-center gap-x-3">
                <Logo size={24} />
                <div class="flex flex-col gap-y-0.5">
                    <Dialog.Title class="text-base font-semibold tracking-tight text-ink-fg"
                        >Chorus settings</Dialog.Title
                    >
                    <Dialog.Description class="text-xs text-ink-muted">
                        Auto-skip rules, keyboard shortcuts, preset lists, the output limiter and
                        the Spotify theme
                    </Dialog.Description>
                </div>
            </div>
        </div>

        <Tabs.Root bind:value={activeTab} class="flex min-h-0 flex-1 flex-col">
            <Tabs.List
                class="h-10 w-full justify-start gap-x-5 rounded-none border-0 border-b border-hairline bg-transparent px-6 py-0"
            >
                {#each TABS as tab (tab.id)}
                    <Tabs.Trigger
                        value={tab.id}
                        class="relative h-10 rounded-none px-0.5 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-sm after:bg-transparent after:content-[''] data-[state=active]:bg-transparent data-[state=active]:after:bg-signal"
                    >
                        {tab.label}
                    </Tabs.Trigger>
                {/each}
            </Tabs.List>

            <div class="chorus-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <Tabs.Content value="auto-skip" class="mt-0"><ChorusConfigAutoSkip /></Tabs.Content>
                <Tabs.Content value="shortcuts" class="mt-0"><ChorusConfigShortcuts /></Tabs.Content
                >
                <Tabs.Content value="fx-eq" class="mt-0"><ChorusConfigFXEQ /></Tabs.Content>
                <Tabs.Content value="audio" class="mt-0"><ChorusConfigAudio /></Tabs.Content>
                <Tabs.Content value="theming" class="mt-0"><ChorusConfigTheming /></Tabs.Content>
            </div>
        </Tabs.Root>
    </Dialog.Content>
</Dialog.Root>
