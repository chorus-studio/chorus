<script lang="ts">
    import EQ from './EQ.svelte'
    import EQControls from '$lib/components/EQControls.svelte'

    let { pip = false }: { pip?: boolean } = $props()

    let sub = $state<'presets' | 'bands'>('presets')

    const subTabs = [
        { id: 'presets', label: 'presets' },
        { id: 'bands', label: 'bands' }
    ] as const
</script>

<div class="flex h-full w-full flex-col gap-y-2">
    <div class="flex items-center justify-end gap-x-1.5">
        {#each subTabs as t (t.id)}
            <button
                onclick={() => (sub = t.id)}
                class="rounded-[2px] px-1.5 py-0 pb-[0.125rem] text-sm font-semibold leading-[18px] text-[#fafafa] transition-colors {sub ===
                t.id
                    ? 'bg-green-700 hover:bg-green-800'
                    : 'bg-zinc-700 hover:bg-zinc-500'}"
            >
                {t.label}
            </button>
        {/each}
    </div>

    {#if sub === 'presets'}
        <EQ {pip} />
    {:else}
        <EQControls {pip} />
    {/if}
</div>
