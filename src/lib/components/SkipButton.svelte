<script lang="ts">
    import { buttonVariants } from '$lib/components/ui/button'
    import { Ban } from 'lucide-svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'

    function handleClick() {
        const nextButton = document.querySelector('[data-testid="control-button-skip-forward"]') as HTMLButtonElement
        nextButton?.click()
    }
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="button"
            aria-label="Block Track"
            onclick={handleClick}
            class={buttonVariants({ variant: 'ghost', size: 'icon', class: 'size-7 bg-transparent hover:bg-transparent border-none stroke-current [&_svg]:size-[1.125rem]' })}
        >
            <Ban size={24} />
        </Tooltip.Trigger>
        <Tooltip.Content class="text-sm bg-background text-white p-2">
            <p>Block Track</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>