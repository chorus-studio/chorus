<script lang="ts">
    // One content type's seek settings as a card: how far the player bar's
    // rewind and forward buttons (and their keys) jump, and for podcasts &
    // audiobooks the jump back on resume.
    import { seekStore, type SeekScope } from '$lib/stores/seek'
    import type { ResumeRewind } from '$lib/utils/resume-rewind'
    import Plus from '@lucide/svelte/icons/plus'
    import Minus from '@lucide/svelte/icons/minus'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import Undo2 from '@lucide/svelte/icons/undo-2'
    import BadgeList from '$lib/components/BadgeList.svelte'

    let {
        scope,
        title,
        hint = '',
        resume = false
    }: { scope: SeekScope; title: string; hint?: string; resume?: boolean } = $props()

    const MIN = 1
    const MAX = 60
    const STEPS = [5, 10, 15, 30]
    const RESUME_SECONDS = [0, 5, 10, 30]
    const RESUME_AFTER = [1, 5, 15]

    type Jump = 'rewind' | 'forward'
    const values = $derived($seekStore[scope])

    async function setSeconds(type: Jump, next: number) {
        const clamped = Math.min(Math.max(Math.round(next), MIN), MAX)
        await seekStore.updateSeek({ [scope]: { ...$seekStore[scope], [type]: clamped } })
    }

    function handleInput(type: Jump, event: Event) {
        const input = event.target as HTMLInputElement
        const parsed = parseInt(input.value, 10)
        if (Number.isNaN(parsed)) {
            input.value = String(values[type])
            return
        }
        setSeconds(type, parsed)
    }

    const setResume = (changes: Partial<ResumeRewind>) =>
        seekStore.updateSeek({ resume: { ...$seekStore.resume, ...changes } })

    const stepButton =
        'chorus-focus inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg transition-colors hover:bg-surface-2/80'
</script>

{#snippet row(type: Jump)}
    {@const value = values[type]}
    <div class="flex h-7 items-center gap-x-2">
        <span class="flex w-[4.5rem] shrink-0 items-center gap-x-1.5">
            <RotateCcw class="size-3 text-ink-muted {type === 'forward' ? '-scale-x-100' : ''}" />
            <span class="rack-label">{type === 'rewind' ? 'Rewind' : 'Forward'}</span>
        </span>
        <button
            type="button"
            aria-label={`Decrease ${type} seconds`}
            onclick={() => setSeconds(type, value - 1)}
            class={stepButton}
        >
            <Minus class="size-3" />
        </button>
        <div class="readout relative flex h-6 w-12 shrink-0 items-center justify-center">
            <input
                aria-label={`${type} seconds`}
                inputmode="numeric"
                {value}
                onchange={(e) => handleInput(type, e)}
                class="w-full bg-transparent text-center font-mono text-xs text-ink-fg focus-visible:outline-none"
            />
            <span class="pointer-events-none absolute right-1.5 font-mono text-[9px] text-ink-muted"
                >s</span
            >
        </div>
        <button
            type="button"
            aria-label={`Increase ${type} seconds`}
            onclick={() => setSeconds(type, value + 1)}
            class={stepButton}
        >
            <Plus class="size-3" />
        </button>
        <BadgeList list={STEPS} current={value} handleSelect={(v) => setSeconds(type, v)} />
    </div>
{/snippet}

<div class="flex flex-col gap-y-1 rounded-lg border border-hairline bg-panel px-2.5 py-1">
    <div class="flex h-4 items-center justify-between gap-x-3">
        <span class="rack-label shrink-0">{title}</span>
        {#if hint}
            <span class="truncate text-[11px] text-ink-muted">{hint}</span>
        {/if}
    </div>

    {@render row('rewind')}
    {@render row('forward')}

    {#if resume}
        <div
            class="flex h-7 items-center gap-x-2"
            title="After a longer pause, pick the episode up a few seconds earlier"
        >
            <span class="flex w-[4.5rem] shrink-0 items-center gap-x-1.5">
                <Undo2 class="size-3 text-ink-muted" />
                <span class="rack-label">Resume</span>
            </span>
            <span class="flex shrink-0">
                <BadgeList
                    list={RESUME_SECONDS}
                    current={$seekStore.resume.seconds}
                    format={(v) => (v === 0 ? 'off' : String(v))}
                    handleSelect={(v) => setResume({ seconds: v })}
                />
            </span>
            <span class="shrink-0 text-[11px] text-ink-muted">s back after</span>
            <span class="flex shrink-0">
                <BadgeList
                    list={RESUME_AFTER}
                    current={$seekStore.resume.after}
                    handleSelect={(v) => setResume({ after: v })}
                />
            </span>
            <span class="shrink-0 text-[11px] text-ink-muted">min</span>
        </div>
    {/if}
</div>
