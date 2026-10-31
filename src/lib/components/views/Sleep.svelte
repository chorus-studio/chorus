<script lang="ts">
    import Mic from '@lucide/svelte/icons/mic'
    import Music from '@lucide/svelte/icons/music'
    import Plus from '@lucide/svelte/icons/plus'
    import Volume1 from '@lucide/svelte/icons/volume-1'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { seekStore } from '$lib/stores/seek'
    import {
        SLEEP_CHOICES,
        SLEEP_MAX_MINUTES,
        SLEEP_MIN_MINUTES,
        clampMinutes,
        isSleepSet,
        sleepStore
    } from '$lib/stores/sleep'
    import {
        SLEEP_FADE_SECONDS,
        sleepCountdown,
        sleepEndsAtClock,
        sleepItemEnd,
        sleepNoun,
        sleepProgress
    } from '$lib/utils/sleep-timer'
    import { secondsToTime } from '$lib/utils/time'
    import { cn } from '$lib/utils.js'

    // The Sleep tab: quick tiles (15, 30, 45, 60 minutes and a custom length),
    // an "end of this track / episode" card and, while a timer runs, a status
    // panel with the countdown, +15 min and a progress bar. Turn off sits in
    // the footer with the other tabs' actions (ActionButtons).
    let { pip = false }: { pip?: boolean } = $props()
    void pip

    const active = $derived(isSleepSet($sleepStore))
    const timed = $derived($sleepStore.ends_at !== null)
    const noun = $derived(sleepNoun($seekStore.media_type))

    // A one-second clock while a timer counts down, re-read whenever the
    // timer is set so a fresh "30:00" never shows as 29:59.
    let now = $state(Date.now())
    $effect(() => {
        if (!timed) return
        const tick = setInterval(() => (now = Date.now()), 1000)
        return () => clearInterval(tick)
    })
    $effect(() => {
        void $sleepStore
        now = Date.now()
    })

    const countdown = $derived(sleepCountdown($sleepStore, now))
    const endsAt = $derived(sleepEndsAtClock($sleepStore))
    const progress = $derived(sleepProgress($sleepStore, now) ?? 0)

    // What's playing, for the end-of card and the running panel: the item ends
    // where its last snip section does, when it carries one.
    const itemEnd = $derived(sleepItemEnd($nowPlaying))
    const itemLeft = $derived(
        itemEnd === null ? null : Math.max(0, Math.round(itemEnd - $nowPlaying.current))
    )
    const itemProgress = $derived(itemEnd ? Math.min(1, $nowPlaying.current / itemEnd) : 0)
    const itemLine = $derived(
        [
            $nowPlaying.title,
            $nowPlaying.artist,
            itemLeft !== null ? `${secondsToTime(itemLeft)} left` : null
        ]
            .filter(Boolean)
            .join(' · ')
    )
    const barWidth = $derived(`${Math.round((timed ? progress : itemProgress) * 100)}%`)

    // The custom tile: a number the user types; Enter (or its label) starts it.
    // It shows the saved value until the user types, and never overwrites typing.
    let custom = $state(String(sleepStore.get().custom_minutes))
    let customFocused = $state(false)
    let lastSaved = sleepStore.get().custom_minutes
    $effect(() => {
        const saved = $sleepStore.custom_minutes
        if (saved === lastSaved) return
        lastSaved = saved
        if (!customFocused) custom = String(saved)
    })

    async function startCustom() {
        const minutes = clampMinutes(custom)
        if (minutes === null) return
        custom = String(minutes)
        await sleepStore.setCustomMinutes(minutes)
        await sleepStore.start(minutes)
    }

    function onCustomKey(event: KeyboardEvent) {
        if (event.key !== 'Enter') return
        event.preventDefault()
        void startCustom()
    }

    function onCustomBlur() {
        customFocused = false
        const minutes = clampMinutes(custom)
        if (minutes === null) {
            custom = String($sleepStore.custom_minutes)
            return
        }
        custom = String(minutes)
        if (minutes !== $sleepStore.custom_minutes) void sleepStore.setCustomMinutes(minutes)
    }

    const tile =
        'chorus-focus flex h-12 flex-col items-center justify-center gap-y-1.5 rounded-md border border-hairline bg-panel text-ink-fg transition-colors hover:bg-surface-2'
    const tileValue = 'font-mono text-[15px] font-medium leading-none tabular-nums'
    const tileUnit = 'font-mono text-[10px] uppercase leading-none tracking-[0.12em] text-ink-muted'
</script>

<div class="flex h-full flex-col gap-y-2.5">
    {#if active}
        <section
            aria-label="Sleep timer status"
            class="flex shrink-0 flex-col gap-y-2 rounded-lg border border-signal/35 bg-panel px-3 py-2.5"
        >
            <div class="flex items-center gap-x-2 text-[11px] leading-none">
                <span class="led" aria-hidden="true"></span>
                <span class="font-medium text-ink-fg-2">Sleep timer on</span>
                <span class="ml-auto truncate text-ink-muted">
                    {#if timed}pauses at {endsAt}{:else}pauses when this {noun} ends{/if}
                </span>
            </div>
            {#if timed}
                <div class="flex items-center justify-between gap-x-3">
                    <span
                        class="font-mono text-[28px] font-medium tabular-nums leading-none text-ink-fg"
                        >{countdown}</span
                    >
                    <button
                        type="button"
                        onclick={() => sleepStore.extend(15)}
                        title="Fifteen more minutes"
                        class="chorus-focus inline-flex h-7 items-center gap-x-1 rounded-md bg-surface-2 px-2.5 text-xs font-medium text-ink-fg transition-colors hover:bg-surface-2/80"
                    >
                        <Plus class="size-3" />
                        15 min
                    </button>
                </div>
            {:else}
                <div class="flex items-center gap-x-2.5">
                    {#if noun === 'episode'}
                        <Mic class="size-4 shrink-0 text-ink-muted" />
                    {:else}
                        <Music class="size-4 shrink-0 text-ink-muted" />
                    {/if}
                    <span class="flex min-w-0 flex-1 flex-col gap-y-1">
                        <span class="truncate text-[13px] font-medium leading-none text-ink-fg"
                            >{$nowPlaying.title ?? `This ${noun}`}</span
                        >
                        <span class="truncate text-[11px] leading-none text-ink-muted"
                            >{$nowPlaying.artist ?? ''}</span
                        >
                    </span>
                    {#if itemLeft !== null}
                        <span class="flex shrink-0 items-baseline gap-x-1">
                            <span
                                class="font-mono text-[22px] font-medium tabular-nums leading-none text-ink-fg"
                                >{secondsToTime(itemLeft)}</span
                            >
                            <span class={tileUnit}>left</span>
                        </span>
                    {/if}
                </div>
            {/if}
            <div class="h-[3px] overflow-hidden rounded-sm bg-surface-2" aria-hidden="true">
                <div
                    class="h-full bg-signal transition-[width] duration-1000 ease-linear"
                    style:width={barWidth}
                ></div>
            </div>
        </section>
    {/if}

    <section class="flex shrink-0 flex-col gap-y-2">
        <span class="rack-label">{active ? 'Change to' : 'Pause in'}</span>
        <div class="grid grid-cols-5 gap-x-2">
            {#each SLEEP_CHOICES as minutes (minutes)}
                <button
                    type="button"
                    class={tile}
                    onclick={() => sleepStore.start(minutes)}
                    title={`Pause in ${minutes} minutes`}
                >
                    <span class={tileValue}>{minutes < 60 ? minutes : minutes / 60}</span>
                    <span class={tileUnit}>{minutes < 60 ? 'min' : 'hour'}</span>
                </button>
            {/each}
            <label
                class={cn(tile, 'cursor-text bg-inset', customFocused && 'ring-2 ring-signal')}
                title={`Any length, ${SLEEP_MIN_MINUTES} to ${SLEEP_MAX_MINUTES} minutes`}
            >
                <input
                    type="number"
                    bind:value={custom}
                    min={SLEEP_MIN_MINUTES}
                    max={SLEEP_MAX_MINUTES}
                    step="1"
                    inputmode="numeric"
                    aria-label="Custom minutes, press Enter to start"
                    class="w-11 bg-transparent text-center font-mono text-[15px] font-medium tabular-nums leading-none text-ink-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onfocus={() => (customFocused = true)}
                    onblur={onCustomBlur}
                    onkeydown={onCustomKey}
                />
                <button
                    type="button"
                    tabindex="-1"
                    onclick={startCustom}
                    class={cn(
                        tileUnit,
                        'rounded-sm px-1 hover:text-ink-fg',
                        customFocused && 'text-signal'
                    )}
                >
                    {customFocused ? '↵ start' : 'custom'}
                </button>
            </label>
        </div>
    </section>

    <button
        type="button"
        aria-pressed={$sleepStore.at_end}
        onclick={() => sleepStore.start('end')}
        class={cn(
            'chorus-focus flex h-[52px] shrink-0 items-center gap-x-2.5 rounded-lg border bg-panel px-3 text-left text-ink-fg transition-colors hover:bg-surface-2',
            $sleepStore.at_end ? 'border-signal/60' : 'border-hairline'
        )}
    >
        {#if noun === 'episode'}
            <Mic
                class={cn('size-4 shrink-0', $sleepStore.at_end ? 'text-signal' : 'text-ink-muted')}
            />
        {:else}
            <Music
                class={cn('size-4 shrink-0', $sleepStore.at_end ? 'text-signal' : 'text-ink-muted')}
            />
        {/if}
        <span class="flex min-w-0 flex-1 flex-col gap-y-1">
            <span class="text-xs font-medium leading-none">End of {noun}</span>
            <span class="truncate text-[11px] leading-none text-ink-muted">
                {#if $sleepStore.at_end}
                    Pauses before the next one starts.{noun === 'episode'
                        ? ' Audiobook chapters too.'
                        : ''}
                {:else}
                    {itemLine || `Pauses before the next ${noun} starts`}
                {/if}
            </span>
        </span>
        <span class="text-xs font-medium leading-none text-signal"
            >{$sleepStore.at_end ? 'On' : 'Set'}</span
        >
    </button>

    {#if !active}
        <div class="mt-auto flex items-start gap-x-1.5 text-[11px] leading-snug text-ink-muted">
            <Volume1 class="mt-px size-3 shrink-0" />
            <span>
                Custom: type the minutes, {SLEEP_MIN_MINUTES} to {SLEEP_MAX_MINUTES}, and press
                Enter. Fades over the last {SLEEP_FADE_SECONDS} seconds, then pauses; the volume comes
                back on the next play.
            </span>
        </div>
    {/if}
</div>
