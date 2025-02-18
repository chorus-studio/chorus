<script lang="ts">
    import { loopStore } from '$lib/stores/loop'
    import { Input } from '$lib/components/ui/input'
    import { Infinity, Tally5Icon } from 'lucide-svelte'
    import * as ToggleGroup from '$lib/components/ui/toggle-group'
    import { buttonVariants } from '$lib/components/ui/button'

    function handleChange(value: string) {
        loopStore.toggleType(value as 'infinite' | 'amount')
    }

    let type = $state($loopStore.type)
    $effect(() => {
        loopStore.subscribe((loop) => {
            type = loop.type
        })
    })
</script>

<div class="flex w-full flex-col items-center justify-between gap-y-2">
    <div class="flex w-full items-center justify-between gap-x-2">
        <ToggleGroup.Root type="single" value={type} onValueChange={handleChange}>
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
            disabled={type === 'infinite'}
            bind:value={$loopStore.iteration}
            oninput={(e) => {
                const value = (e.target as HTMLInputElement).value
                loopStore.setIteration(Number(value))
            }}
        />
    </div>
</div>
