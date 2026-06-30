<script lang="ts">
    import Settings from './Settings.svelte'
    import Info from './Info.svelte'

    let { pip = false }: { pip?: boolean } = $props()

    // Settings and info are both "settings" screens; switch between them in one page.
    let sub = $state<'settings' | 'about'>('settings')

    const subTabs = [
        { id: 'settings', label: 'settings' },
        { id: 'about', label: 'about' }
    ] as const
</script>

<div class="flex h-full w-full flex-col gap-y-2">
    <div class="flex items-center gap-x-1.5 justify-end">
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

    {#if sub === 'settings'}
        <Settings />
    {:else}
        <Info {pip} />
    {/if}
</div>
