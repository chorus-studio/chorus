<script lang="ts">
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    // Thin compatibility wrapper: a labelled segmented control.
    let {
        list,
        value,
        label = '',
        onValueChange,
        pip = false,
        labelClass = '',
        size = 'sm',
        grow = false
    }: {
        list: Array<{ label: string; value: string; title?: string }>
        value: string
        label?: string
        onValueChange: (value: string) => void
        pip?: boolean
        labelClass?: string
        size?: 'xs' | 'sm' | 'md'
        grow?: boolean
    } = $props()
    void pip
</script>

<div class="flex w-full items-center justify-between gap-x-3">
    {#if label}
        <span class="truncate text-xs text-ink-muted {labelClass}">{label}</span>
    {/if}
    <SegmentedControl
        options={list}
        {value}
        {onValueChange}
        {size}
        {grow}
        ariaLabel={label || 'options'}
    />
</div>
