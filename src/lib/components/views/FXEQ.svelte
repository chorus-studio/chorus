<script lang="ts">
    import FX from '$lib/components/views/FX.svelte'
    import EQ from '$lib/components/views/EQ.svelte'

    let { pip = false }: { pip?: boolean } = $props()
</script>

<div class="flex h-full w-full justify-center gap-x-2.5">
    <FX {pip} />
    <EQ {pip} />
</div>
