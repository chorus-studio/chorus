<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'
    import type { EffectList } from '$lib/stores/effect-frequents'

    import type { Selection } from '$lib/types'
    import Info from '@lucide/svelte/icons/info'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import RecentChips from '$lib/components/RecentChips.svelte'
    import { cn } from '$lib/utils'

    let {
        pip = false,
        type,
        topLabel,
        topSelected,
        topHint = '',
        topRecent,
        bottomLabel,
        bottomHint = '',
        bottomRecent,
        topOptions,
        bottomOptions,
        note = ''
    }: {
        type: 'reverb' | 'equalizer' | 'msProcessor'
        topSelected: boolean
        topLabel: string
        topHint?: string
        /** The frequents list shown as chips under the top picker, if any. */
        topRecent?: EffectList
        bottomLabel: string
        bottomHint?: string
        bottomRecent?: EffectList
        topOptions: Selection[]
        bottomOptions: Selection[]
        note?: string
        pip?: boolean
    } = $props()

    async function handleUpdateEffect(value: string) {
        await effectsStore.updateEffect({ key: type, value })
    }

    const names = (options: Selection[]) => options.map((o) => o.value).filter((v) => v !== 'none')
</script>

{#snippet card(
    label: string,
    hint: string,
    key: string,
    selected: string,
    options: Selection[],
    recent: EffectList | undefined
)}
    <div
        data-card
        class={cn(
            'flex flex-col gap-y-1 rounded-lg border border-hairline bg-panel px-2.5',
            note ? 'py-0.5' : 'py-1'
        )}
    >
        <div class="flex h-4 items-center justify-between gap-x-3">
            <span class="rack-label shrink-0" title={hint || undefined}>{label}</span>
            {#if hint}
                <span data-hint class="truncate text-[11px] text-ink-muted">{hint}</span>
            {/if}
        </div>
        <CustomSelect
            {pip}
            size="sm"
            {key}
            {selected}
            {options}
            onValueChange={handleUpdateEffect}
            class="w-full"
        />
        {#if recent}
            <RecentChips list={recent} allowed={names(options)} />
        {/if}
    </div>
{/snippet}

<!-- The two cards fill the frame; a note under them only fits with the cards
     and the gap between them pulled in by a few pixels. -->
<div data-cards class={cn('flex h-full flex-col', note ? 'gap-y-2' : 'gap-y-3')}>
    {@render card(
        topLabel,
        topHint,
        `${type}-top`,
        topSelected ? $effectsStore[type] : 'none',
        topOptions,
        topRecent
    )}
    {@render card(
        bottomLabel,
        bottomHint,
        `${type}-bottom`,
        !topSelected ? $effectsStore[type] : 'none',
        bottomOptions,
        bottomRecent
    )}

    {#if note}
        <p class="mt-auto flex items-center gap-x-1.5 text-[11px] text-ink-muted">
            <Info class="size-3 shrink-0" />
            {note}
        </p>
    {/if}
</div>
