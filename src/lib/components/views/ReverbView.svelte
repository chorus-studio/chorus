<script lang="ts">
    import FX from './FX.svelte'
    import ReverbControls from '$lib/components/ReverbControls.svelte'

    let { pip = false }: { pip?: boolean } = $props()

    let sub = $state<'presets' | 'config'>('presets')

    const subTabs = [
        { id: 'presets', label: 'presets' },
        { id: 'config', label: 'config' }
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
        <FX {pip} />
    {:else}
        <ReverbControls {pip} />
    {/if}
</div>
