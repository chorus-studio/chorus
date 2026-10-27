<script lang="ts">
    import type { Snippet } from 'svelte'
    import { effectsStore } from '$lib/stores/effects'

    import type { Selection } from '$lib/types'
    import Info from '@lucide/svelte/icons/info'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    let {
        pip = false,
        type,
        topLabel,
        topSelected,
        topHint = '',
        bottomLabel,
        bottomHint = '',
        topOptions,
        bottomOptions,
        note = '',
        children
    }: {
        type: 'reverb' | 'equalizer' | 'msProcessor'
        topSelected: boolean
        topLabel: string
        topHint?: string
        bottomLabel: string
        bottomHint?: string
        topOptions: Selection[]
        bottomOptions: Selection[]
        note?: string
        pip?: boolean
        /** Rendered between the pickers and the note: the Recent chips. */
        children?: Snippet
    } = $props()

    async function handleUpdateEffect(value: string) {
        await effectsStore.updateEffect({ key: type, value })
    }
</script>

<div class="flex h-full flex-col gap-y-2">
    <div class="flex flex-col gap-y-2 rounded-lg border border-hairline bg-panel px-3 py-2">
        <div class="flex flex-col gap-y-1">
            <div class="flex h-4 items-center justify-between gap-x-3">
                <span class="rack-label shrink-0">{topLabel}</span>
                {#if topHint}
                    <span class="truncate text-[11px] text-ink-muted">{topHint}</span>
                {/if}
            </div>
            <CustomSelect
                {pip}
                size="md"
                key={`${type}-top`}
                selected={topSelected ? $effectsStore[type] : 'none'}
                options={topOptions}
                onValueChange={handleUpdateEffect}
                class="w-full"
            />
        </div>

        <div class="flex flex-col gap-y-1">
            <div class="flex h-4 items-center justify-between gap-x-3">
                <span class="rack-label shrink-0">{bottomLabel}</span>
                {#if bottomHint}
                    <span class="truncate text-[11px] text-ink-muted">{bottomHint}</span>
                {/if}
            </div>
            <CustomSelect
                {pip}
                size="md"
                key={`${type}-bottom`}
                selected={!topSelected ? $effectsStore[type] : 'none'}
                options={bottomOptions}
                onValueChange={handleUpdateEffect}
                class="w-full"
            />
        </div>
    </div>

    {@render children?.()}

    {#if note}
        <p class="mt-auto flex items-center gap-x-1.5 text-[11px] text-ink-muted">
            <Info class="size-3 shrink-0" />
            {note}
        </p>
    {/if}
</div>
