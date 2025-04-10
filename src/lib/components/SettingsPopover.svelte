<script lang="ts">
    import { mount, unmount } from 'svelte'
    import { PictureInPicture } from 'lucide-svelte'

    import { nowPlaying } from '$lib/stores/now-playing'
    import { supporterStore } from '$lib/stores/supporter'

    import * as Tooltip from '$lib/components/ui/tooltip'
    import * as Popover from '$lib/components/ui/popover'
    import PipView from '$lib/components/views/Pip.svelte'
    import TabsList from '$lib/components/TabsList.svelte'
    import AvatarLogo from '$lib/components/AvatarLogo.svelte'
    import { buttonVariants, Button } from '$lib/components/ui/button'

    let isOpen = $state(false)

    async function applyStyles(pipWindow: Window) {
        // Copy all stylesheets from the main window
        ;[...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('')
                if (!cssRules) return

                const style = pipWindow.document.createElement('style')
                style.textContent = cssRules
                pipWindow.document.head.appendChild(style)
            } catch (e) {
                const link = document.createElement('link')
                link.rel = 'stylesheet'
                link.type = styleSheet.type || 'text/css'
                link.media = styleSheet.media?.mediaText || 'all'
                if (styleSheet.href) {
                    link.href = styleSheet.href
                    pipWindow.document.head.appendChild(link)
                }
            }
        })

        // Add the chorus stylesheet
        const style = chrome.runtime.getURL('content-scripts/chorus.css')
        const link = pipWindow.document.createElement('link')
        link.href = style
        link.rel = 'stylesheet'
        pipWindow.document.head.appendChild(link)
    }

    async function togglePictureInPicture() {
        if (!('documentPictureInPicture' in window)) {
            console.warn('Document Picture-in-Picture API not supported')
            return
        }

        try {
            const pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 350,
                height: 270
            })

            // Create a container for the PipView
            const pipView = document.createElement('div')
            pipView.id = 'chorus-pip-view'

            // Apply styles
            await applyStyles(pipWindow)
            pipWindow.document.body.appendChild(pipView)

            // Mount the PipView component
            const app = mount(PipView, {
                target: pipView
            })

            isOpen = false

            pipWindow.addEventListener('resize', (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('resize')
            })

            pipWindow.addEventListener('exitpictureinpicture', async (e) => {
                await unmount(app)
            })
        } catch (error) {
            console.error('Error opening Picture-in-Picture window:', error)
        }
    }
</script>

<div class="space-between flex border-none">
    <Popover.Root bind:open={isOpen}>
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
            {#if $supporterStore.isSupporter}
                <Button
                    variant="ghost"
                    size="icon"
                    onclick={togglePictureInPicture}
                    class="absolute left-0 top-0 size-6 border-none bg-transparent text-[var(--text)] brightness-75 hover:bg-transparent hover:text-[var(--text)] [&_svg]:size-[1rem]"
                >
                    <PictureInPicture />
                </Button>
            {/if}
            <div class="relative flex flex-col justify-center">
                <AvatarLogo class="absolute top-[0.25rem] size-5" />
                <TabsList />
            </div>
        </Popover.Content>
    </Popover.Root>
</div>
