<script lang="ts">
    import { loopStore } from '$lib/stores/loop'
    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import { Infinity, Tally5Icon } from 'lucide-svelte'
    import { buttonVariants } from '$lib/components/ui/button'
    import * as ToggleGroup from '$lib/components/ui/toggle-group'

    async function handleChange(value: string) {
        await loopStore.toggleType(value as 'infinite' | 'amount')
    }

    $: showCount = $loopStore.looping && $loopStore.type === 'amount'
</script>

<div
    class="relative flex w-full flex-col items-center justify-between gap-y-2 {showCount
        ? 'pb-2.5'
        : ''}"
>
    <div class="relative flex w-full items-center justify-between gap-x-2">
        <ToggleGroup.Root type="single" value={$loopStore.type} onValueChange={handleChange}>
            <ToggleGroup.Item
                value="infinite"
                class={buttonVariants({
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-7 w-7 min-w-7 rounded-sm [&_svg]:size-5'
                })}
            >
                <Infinity size={20} />
            </ToggleGroup.Item>
            <ToggleGroup.Item
                value="amount"
                class={buttonVariants({
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-7 w-7 min-w-7 rounded-sm [&_svg]:size-5'
                })}
            >
                <Tally5Icon size={20} />
            </ToggleGroup.Item>
        </ToggleGroup.Root>

        <Input
            type="number"
            min={1}
            placeholder="1"
            class="h-8 w-full"
            disabled={$loopStore.type === 'infinite'}
            value={$loopStore.iteration}
            oninput={async (e) => {
                const value = (e.target as HTMLInputElement).value
                await loopStore.setIteration(Number(value))
            }}
        />
    </div>
    {#if showCount}
        <Label class="absolute -bottom-2 right-0 text-xs text-muted-foreground"
            >loop{$loopStore.iteration > 1 ? 's' : ''} left: {$loopStore.iteration}</Label
        >
    {/if}
</div>
