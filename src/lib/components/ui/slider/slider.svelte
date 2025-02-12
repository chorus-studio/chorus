<script lang="ts">
	import { Slider as SliderPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(),
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();

	export { className as class };
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	class={cn("relative flex w-full touch-none select-none items-center", className)}
	{...restProps}
>
	{#snippet children({ thumbs })}
		<span class="bg-primary/20 relative h-1 w-full grow overflow-hidden rounded-full">
			<SliderPrimitive.Range class="bg-green-500 absolute h-full" />
		</span>
		{#each thumbs as thumb}
			<SliderPrimitive.Thumb
				index={thumb}
				class="border-green-500 border-2 hover:shadow-slider active:shadow-slider bg-white focus-visible:ring-ring block size-2.5 p-1 rounded-full shadow transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>