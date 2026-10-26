<script lang="ts">
    import { loopStore } from '$lib/stores/loop'
    import { seekStore } from '$lib/stores/seek'
    import { mediaStore } from '$lib/stores/media'
    import { cn } from '$lib/utils.js'

    import Ban from '@lucide/svelte/icons/ban'
    import Play from '@lucide/svelte/icons/play'
    import Heart from '@lucide/svelte/icons/heart'
    import Pause from '@lucide/svelte/icons/pause'
    import Repeat from '@lucide/svelte/icons/repeat'
    import Shuffle from '@lucide/svelte/icons/shuffle'
    import Repeat1 from '@lucide/svelte/icons/repeat-1'
    import SkipBack from '@lucide/svelte/icons/skip-back'
    import SkipForward from '@lucide/svelte/icons/skip-forward'

    // Transport button for the popup / PiP. Colours come from the album palette:
    // --text for idle, --accent (adaptive green) for "on" states, and the play
    // button inverts --text / --bg.
    let {
        icon,
        pip = false,
        handleClick
    }: { icon: string; pip?: boolean; handleClick: (role: string) => void } = $props()

    const isPlayPause = $derived(icon === 'play' || icon === 'pause')
    const isSeek = $derived(icon.startsWith('seek'))

    const seekValue = $derived(
        icon == 'seek-forward'
            ? $seekStore.media_type == 'long_form'
                ? $seekStore.long_form.forward
                : $seekStore.default.forward
            : $seekStore.media_type == 'long_form'
              ? $seekStore.long_form.rewind
              : $seekStore.default.rewind
    )

    const active = $derived.by(() => {
        switch (icon) {
            case 'save/unsave':
                return Boolean($mediaStore.saved)
            case 'loop':
                return $loopStore.looping
            case 'shuffle':
                return $mediaStore.shuffle
            case 'repeat':
                return $mediaStore.repeat == 'default'
            case 'repeat1':
            case 'dj':
                return true
            default:
                return false
        }
    })

    const badge = $derived.by(() => {
        // Seek buttons hang their seconds under the arrow.
        if (isSeek) return String(seekValue)
        // The loop glyph already reads as ∞; only a counted loop needs a badge.
        if (icon === 'loop' && $loopStore.looping && $loopStore.type !== 'infinite') {
            return String($loopStore.iteration)
        }
        return ''
    })

    const LABELS: Record<string, string> = {
        'save/unsave': 'Save to Liked Songs',
        'block-track': 'Block track and skip',
        loop: 'Loop snip or track',
        shuffle: 'Shuffle',
        'seek-rewind': 'Seek back',
        previous: 'Previous',
        play: 'Play',
        pause: 'Pause',
        next: 'Next',
        'seek-forward': 'Seek forward',
        repeat: 'Repeat',
        repeat1: 'Repeat one',
        dj: 'DJ'
    }
    const label = $derived(
        icon === 'save/unsave' && $mediaStore.saved
            ? 'Remove from Liked Songs'
            : isSeek
              ? `${LABELS[icon]} ${seekValue} seconds`
              : (LABELS[icon] ?? icon)
    )

    function onClick() {
        const role = isPlayPause ? 'play/pause' : icon?.startsWith('repeat') ? 'repeat' : icon
        handleClick(role)
    }

    const size = $derived(pip ? 'size-7' : 'size-[26px]')
    const iconSize = $derived(pip ? 'size-4' : 'size-[15px]')
</script>

<button
    type="button"
    onclick={onClick}
    aria-label={label}
    title={label}
    aria-pressed={['save/unsave', 'loop', 'shuffle', 'repeat', 'repeat1'].includes(icon)
        ? active
        : undefined}
    data-control={icon}
    class={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full transition-[opacity,transform,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--album-accent)]',
        isPlayPause
            ? cn(
                  pip ? 'size-[34px]' : 'size-[30px]',
                  'bg-[color:var(--text)] text-[color:var(--bg)] hover:scale-105'
              )
            : icon === 'dj'
              ? cn(size, 'bg-[color:var(--album-accent)] text-[color:var(--bg)]')
              : cn(
                    size,
                    'hover:bg-[color:color-mix(in_srgb,var(--text)_12%,transparent)] hover:opacity-100',
                    active
                        ? 'text-[color:var(--album-accent)] opacity-100'
                        : 'text-[color:var(--text)] opacity-75'
                )
    )}
>
    {#if icon === 'save/unsave'}
        <Heart class={cn(iconSize, active && 'fill-current')} />
    {:else if icon === 'block-track'}
        <Ban class={iconSize} />
    {:else if icon === 'loop'}
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={iconSize}
            aria-hidden="true"
        >
            <path
                d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"
            />
        </svg>
    {:else if icon === 'shuffle'}
        <Shuffle class={iconSize} />
    {:else if isSeek}
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={cn(
                pip ? 'size-[18px]' : 'size-[17px]',
                icon === 'seek-forward' && '-scale-x-100'
            )}
            aria-hidden="true"
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    {:else if icon === 'previous'}
        <SkipBack class={cn(iconSize, 'fill-current')} />
    {:else if icon === 'next'}
        <SkipForward class={cn(iconSize, 'fill-current')} />
    {:else if icon === 'play'}
        <Play class={cn(iconSize, 'ml-0.5 fill-current stroke-none')} />
    {:else if icon === 'pause'}
        <Pause class={cn(iconSize, 'fill-current stroke-none')} />
    {:else if icon === 'repeat'}
        <Repeat class={iconSize} />
    {:else if icon === 'repeat1'}
        <Repeat1 class={iconSize} />
    {:else if icon === 'dj'}
        <span class="font-mono text-[9px] font-bold leading-none">DJ</span>
    {/if}

    {#if badge}
        <span
            class="pointer-events-none absolute inset-x-0 -bottom-0.5 text-center font-mono text-[8px] font-bold leading-none"
        >
            {badge}
        </span>
    {/if}
</button>
