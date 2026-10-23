<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import Info from '@lucide/svelte/icons/info'
    import SeekInput from '$lib/components/SeekInput.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    async function handleValueChange(value: string) {
        await seekStore.updateSeek({ is_long_form: value === 'long_form' })
    }

    const scope = $derived($seekStore.is_long_form ? 'long_form' : 'default')
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <SegmentedControl
        grow
        size="sm"
        ariaLabel="Applies to"
        value={scope}
        onValueChange={handleValueChange}
        options={[
            { label: 'Music', value: 'default' },
            { label: 'Podcasts & audiobooks', value: 'long_form' }
        ]}
    />

    <div class="grid grid-cols-2 gap-x-2.5">
        <SeekInput type="rewind" />
        <SeekInput type="forward" />
    </div>

    <p class="mt-auto flex items-center gap-x-1.5 text-[11px] text-ink-muted">
        <Info class="size-3 shrink-0" />
        Separate values for music and for podcasts &amp; audiobooks. 1–60 s.
    </p>
</div>
