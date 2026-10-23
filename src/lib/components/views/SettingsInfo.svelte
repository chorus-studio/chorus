<script lang="ts">
    import Settings from './Settings.svelte'
    import Info from './Info.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    let { pip = false }: { pip?: boolean } = $props()

    // Settings and about are both "settings" screens; switch between them in one page.
    let sub = $state<'settings' | 'about'>('settings')
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <div class="flex items-center justify-between gap-x-2">
        <span class="text-[13px] font-semibold text-ink-fg"
            >{sub === 'settings' ? 'Settings' : 'About'}</span
        >
        <SegmentedControl
            size="xs"
            ariaLabel="Section"
            value={sub}
            onValueChange={(v) => (sub = v as 'settings' | 'about')}
            options={[
                { label: 'Settings', value: 'settings' },
                { label: 'About', value: 'about' }
            ]}
        />
    </div>

    {#if sub === 'settings'}
        <Settings />
    {:else}
        <Info {pip} />
    {/if}
</div>
