<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import * as Popover from '$lib/components/ui/popover'
    import TabsList from '$lib/components/TabsList.svelte'
    import { buttonVariants } from '$lib/components/ui/button'

    const src = browser.runtime.getURL('/icon/32.png')
</script>

<div class="space-between flex border-none">
    <Popover.Root>
        <Popover.Trigger
            id="chorus-settings"
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'size-7 border-none bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <svg
                            id="settings-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                        >
                            <g
                                class="stroke-linecap-round stroke-2 {$nowPlaying?.snip ||
                                $nowPlaying?.playback
                                    ? 'fill-green-400 stroke-green-400'
                                    : 'fill-current stroke-current'}"
                            >
                                <path d="M3 5h4m14 0H11m-8 7h12m6 0h-2M3 19h2m16 0H9" />
                                <circle cx="9" cy="5" r="2" />
                                <circle cx="17" cy="12" r="2" />
                                <circle cx="7" cy="19" r="2" />
                            </g>
                        </svg>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="bg-background p-2 text-sm text-white">
                        <p>Settings</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </Popover.Trigger>
        <Popover.Content
            customAnchor="[data-testid='CoverSlotCollapsed__container']"
            side="left"
            align="end"
            class="fixed bottom-20 left-[80px] h-[270px] w-[350px] rounded-md outline-4 outline-offset-0 outline-[#28e269]"
        >
            <div class="relative flex flex-col justify-center">
                <img
                    {src}
                    alt="chorus logo"
                    class="absolute top-[0.375rem] h-5 w-5 pb-[0.125rem]"
                />
                <TabsList />
            </div>
        </Popover.Content>
    </Popover.Root>
</div>
