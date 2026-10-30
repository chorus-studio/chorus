<script lang="ts">
    import { onMount } from 'svelte'
    import Moon from '@lucide/svelte/icons/moon'
    import X from '@lucide/svelte/icons/x'
    import { sleepStore, SLEEP_CHOICES, isSleepSet, type SleepChoice } from '$lib/stores/sleep'
    import { sleepLabel, sleepShort } from '$lib/utils/sleep-timer'
    import { cn } from '$lib/utils.js'

    // The popup header's sleep timer: a moon that reads the state ("23m",
    // "track") and, when clicked, swaps the header's icons for a row of
    // choices. A chip row, not a menu: a floating menu would be clipped by
    // the popup window's bounds.
    let { open = $bindable(false), class: className = '' }: { open?: boolean; class?: string } =
        $props()

    // The countdown moves while the popup stays open, and re-reads the clock
    // whenever the timer is set so a fresh "30m" never shows as 31.
    let now = $state(Date.now())
    onMount(() => {
        const tick = setInterval(() => (now = Date.now()), 15_000)
        return () => clearInterval(tick)
    })
    $effect(() => {
        void $sleepStore
        now = Date.now()
    })

    const active = $derived(isSleepSet($sleepStore))
    const short = $derived(sleepShort($sleepStore, now))
    const label = $derived(
        active
            ? `Sleep timer: pauses ${sleepLabel($sleepStore, now)} — click to change`
            : 'Sleep timer: pause playback later'
    )

    async function choose(choice: SleepChoice | null) {
        if (choice === null) await sleepStore.stop()
        else await sleepStore.start(choice)
        open = false
    }

    const chip =
        'inline-flex h-5 shrink-0 items-center rounded-md px-1.5 font-mono text-[10px] leading-none text-[color:var(--text)] bg-[color:color-mix(in_srgb,var(--text)_12%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--text)_22%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)]'
</script>

{#if open}
    <div class="flex items-center gap-x-1" role="group" aria-label="Pause playback">
        {#each SLEEP_CHOICES as minutes (minutes)}
            <button type="button" class={chip} onclick={() => choose(minutes)}>
                {minutes < 60 ? `${minutes}m` : '1h'}
            </button>
        {/each}
        <button type="button" class={chip} onclick={() => choose('track')}>track end</button>
        {#if active}
            <button
                type="button"
                class={chip}
                aria-label="Turn the sleep timer off"
                onclick={() => choose(null)}
            >
                <X class="size-3" />
            </button>
        {/if}
    </div>
{/if}
<button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={open}
    aria-expanded={open}
    onclick={() => (open = !open)}
    class={cn(
        className,
        (active || open) && 'opacity-100',
        active && 'text-[color:var(--album-accent)]',
        active && !open && 'w-auto gap-x-1 px-1.5'
    )}
>
    <Moon />
    {#if active && short && !open}
        <span class="font-mono text-[10px] leading-none">{short}</span>
    {/if}
</button>
