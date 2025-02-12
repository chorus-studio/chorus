<script lang="ts">
    import "./app.css";
    import { ModeWatcher } from "mode-watcher";
    import { buttonVariants } from '$lib/components/ui/button'
    import * as Popover from '$lib/components/ui/popover'
</script>

<ModeWatcher defaultMode="dark" />
<div class="border-none flex space-between">
    <Popover.Root>
        <Popover.Trigger class={buttonVariants({ variant: "ghost", size: "icon", class: "size-7 px-0 [&_svg]:size-[1.125rem]" })}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <g class="fill-green-400 stroke-green-400 stroke-2 stroke-linecap-round">
                        <path d="M3 5h4m14 0H11m-8 7h12m6 0h-2M3 19h2m16 0H9" />
                        <circle cx="9" cy="5" r="2" />
                        <circle cx="17" cy="12" r="2" />
                        <circle cx="7" cy="19" r="2" />
                    </g>
                </svg>
        </Popover.Trigger>
        <Popover.Content customAnchor="[data-testid='CoverSlotCollapsed__container']" side="left" align="end" class="fixed bottom-20 left-[80px] h-[270px] w-[350px] border-2 rounded-md">
                <div class="flex flex-col gap-2 justify-center">
                    <h1>Chorus</h1>
                    <h1>Chorus</h1>
                    <h1>Chorus</h1>
                    <h1>Chorus</h1>
                    <h1>Chorus</h1>
                </div>
        </Popover.Content>
    </Popover.Root>
    </div>
