<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { nowPlaying } from '$lib/stores/now-playing'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    let { role }: { role: 'seek-forward' | 'seek-backward' } = $props()

    const isForward = $derived(role == 'seek-forward')
    const isLongForm = $derived($seekStore.media_type == 'long_form')
    const seekValue = $derived(
        isForward
            ? isLongForm
                ? $seekStore.long_form.forward
                : $seekStore.default.forward
            : isLongForm
              ? $seekStore.long_form.rewind
              : $seekStore.default.rewind
    )

    function handleSeek() {
        const offset = seekValue

        // Only clamp forward seeks when duration is known — 0 means "never
        // known", and clamping to it would restart the track. The media
        // element clamps overshoots to its seekable range itself.
        const value = isForward
            ? $nowPlaying.duration > 0
                ? Math.min($nowPlaying.current + offset, $nowPlaying.duration)
                : $nowPlaying.current + offset
            : Math.max($nowPlaying.current - offset, 0)

        window.postMessage({ type: 'FROM_CURRENT_TIME_LISTENER', data: value }, '*')
    }

    const id = $derived(role == 'seek-forward' ? 'seek-player-ff-button' : 'seek-player-rw-button')
    const label = $derived(
        isForward ? `Seek forward ${seekValue} seconds` : `Seek back ${seekValue} seconds`
    )
</script>

<Tooltip.Provider delayDuration={300}>
    <Tooltip.Root>
        <Tooltip.Trigger
            {id}
            onclick={handleSeek}
            aria-label={label}
            class={buttonVariants({
                variant: 'bar',
                size: 'icon',
                class: 'relative [&_svg]:size-[20px]'
            })}
        >
            <!-- Arrow sits on the row's centreline like its neighbours; the
                 seconds hang below it as a badge, the same way the loop count
                 does, instead of being squeezed inside the circle. -->
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class={isForward ? '-scale-x-100' : ''}
                aria-hidden="true"
            >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
            </svg>
            <span
                class="pointer-events-none absolute inset-x-0 -bottom-1 text-center font-mono text-xs font-bold leading-none"
            >
                {seekValue}
            </span>
        </Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
