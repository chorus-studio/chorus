<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'

    import * as Tooltip from '$lib/components/ui/tooltip'
    import * as Popover from '$lib/components/ui/popover'
    import TabsList from '$lib/components/TabsList.svelte'
    import { buttonVariants } from '$lib/components/ui/button'

    let isOpen = $state(false)
    // The trigger glows when the current track carries Chorus state (a snip or a
    // per-track speed) so the user can tell at a glance without opening it.
    const engaged = $derived(Boolean($nowPlaying?.snip || $nowPlaying?.playback))
</script>

<Popover.Root bind:open={isOpen}>
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                    <Popover.Trigger
                        {...tooltipProps}
                        id="chorus-settings"
                        aria-label="Chorus controls"
                        class={buttonVariants({
                            variant: 'bar',
                            size: 'icon-sm',
                            class: `[&_svg]:size-[18px] ${engaged ? 'text-signal-bright opacity-100' : ''} ${isOpen ? 'opacity-100' : ''}`
                        })}
                    >
                        <svg
                            id="settings-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M3 5h4m14 0H11m-8 7h12m6 0h-2M3 19h2m16 0H9" />
                            <circle cx="9" cy="5" r="2" fill="currentColor" />
                            <circle cx="17" cy="12" r="2" fill="currentColor" />
                            <circle cx="7" cy="19" r="2" fill="currentColor" />
                        </svg>
                    </Popover.Trigger>
                {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>Chorus controls</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Popover.Content
        customAnchor="[data-testid='cover-art-container']"
        side="left"
        align="end"
        class="fixed bottom-[88px] left-[72px] h-[320px] w-[400px] overflow-hidden p-0"
    >
        <TabsList />
    </Popover.Content>
</Popover.Root>
