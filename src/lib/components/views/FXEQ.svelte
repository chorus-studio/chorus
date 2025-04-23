<script lang="ts">
    import FX from '$lib/components/views/FX.svelte'
    import EQ from '$lib/components/views/EQ.svelte'
    import { Separator } from '$lib/components/ui/separator'

    let { pip = false }: { pip?: boolean } = $props()
</script>

<div class="flex h-full w-full gap-x-2">
    <FX {pip} />
    <Separator orientation="vertical" class="h-full w-0.5" />
    <EQ {pip} />
</div>
