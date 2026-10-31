<script lang="ts">
    import { onMount } from 'svelte'
    import Moon from '@lucide/svelte/icons/moon'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'
    import { popoverTab } from '$lib/stores/effects-ui'
    import { seekStore } from '$lib/stores/seek'
    import { isSleepSet, sleepStore } from '$lib/stores/sleep'
    import { sleepLabel, sleepNoun, sleepShort } from '$lib/utils/sleep-timer'

    // The player tray's sleep timer: a moon with the time left, shown only
    // while a timer runs, last in the tray. Clicking it opens the popover on
    // the Sleep tab, where the timer is changed or turned off.
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
        `Sleep timer: pauses ${sleepLabel($sleepStore, now, sleepNoun($seekStore.media_type))}. Open the Sleep tab`
    )
</script>

{#if active}
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger
                id="chorus-sleep"
                onclick={() => popoverTab.set('sleep')}
                aria-label={label}
                class={buttonVariants({
                    variant: 'bar',
                    size: 'sm',
                    class: 'gap-x-1 px-1.5 text-signal-bar opacity-100 [&_svg]:size-[18px]'
                })}
            >
                <Moon />
                {#if short}
                    <span class="font-mono text-[11px] tabular-nums leading-none">{short}</span>
                {/if}
            </Tooltip.Trigger>
            <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>
{/if}
