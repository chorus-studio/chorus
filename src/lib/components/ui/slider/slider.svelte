<script lang="ts">
    import { Slider as SliderPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        value = $bindable(),
        ...restProps
    }: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props()

    export { className as class }
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
    bind:ref
    bind:value={value as never}
    class={cn('relative flex w-full touch-none select-none items-center', className)}
    {...restProps}
>
    {#snippet children({ thumbs })}
        <span class="relative h-1 w-full grow overflow-hidden rounded-full bg-primary/20">
            <SliderPrimitive.Range class="absolute h-full bg-green-500" />
        </span>
        {#each thumbs as thumb}
            <SliderPrimitive.Thumb
                index={thumb}
                class="hover:shadow-slider active:shadow-slider block size-2.5 rounded-full border-2 border-green-500 bg-white p-1 shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            />
        {/each}
    {/snippet}
</SliderPrimitive.Root>
