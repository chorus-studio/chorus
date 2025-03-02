<script lang="ts">
    import { Progress as ProgressPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        innerClass: innerClassName,
        max = 100,
        value,
        segments = [],
        dividerColor = '#fff',
        ...restProps
    }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> & {
        segments?: Array<{
            start: number
            end: number
            color?: string
            class?: string
        }>
        innerClass?: string
        dividerColor?: string
    } = $props()

    const sortedSegments = $derived(segments.sort((a, b) => a.start - b.start))
    const totalSegments = $derived(segments.length)
    const hasSegments = $derived(totalSegments > 0)
    const currentValue = $derived(value ?? 0)

    // Get all unique boundary points for segments
    const segmentBoundaries = $derived(
        hasSegments
            ? Array.from(new Set(segments.flatMap((seg) => [seg.start, seg.end]))).sort(
                  (a, b) => a - b
              )
            : []
    )

    // Check if current value falls within any segment
    const activeSegment = $derived(
        hasSegments
            ? sortedSegments.find((seg) => currentValue >= seg.start && currentValue <= seg.end)
            : null
    )

    // Calculate the progress for the default UI when value is outside segments
    const defaultProgress = $derived(() => {
        if (!hasSegments || !activeSegment) {
            return (100 * currentValue) / (max ?? 1)
        }
        return 0
    })

    function getSegmentProgress(segment: { start: number; end: number }) {
        if (currentValue <= segment.start) return 0
        if (currentValue >= segment.end) return 100
        return ((currentValue - segment.start) / (segment.end - segment.start)) * 100
    }

    function getLighterColor(color: string) {
        return `color-mix(in srgb, ${color}, white 65%)`
    }
</script>

<ProgressPrimitive.Root
    bind:ref
    value={currentValue}
    class={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className,
        activeSegment ? 'overflow-visible' : 'overflow-hidden'
    )}
    {...restProps}
>
    {#if hasSegments}
        <!-- Segment boundary lines -->
        {#each segmentBoundaries as point (point)}
            <div
                class="absolute -top-[4px] z-10 h-[calc(100%+8px)] w-[2px]"
                style={`
                    left: ${(point / max) * 100}%;
                    background-color: ${dividerColor};
                    transform: translateX(-50%);
                `}
            ></div>
        {/each}

        <!-- Segments -->
        {#each sortedSegments as segment}
            <div
                class={cn('absolute h-full transition-all', segment.class)}
                style={`
                    left: ${(segment.start / max) * 100}%;
                    width: ${((segment.end - segment.start) / max) * 100}%;
                    background-color: ${getLighterColor(segment.color || 'var(--primary)')};
                `}
            >
                <div
                    class="h-full transition-all"
                    style={`
                        width: ${getSegmentProgress(segment)}%;
                        background-color: ${segment.color || 'var(--primary)'};
                    `}
                ></div>
            </div>
        {/each}
    {/if}

    {#if !activeSegment}
        <div
            class={cn('h-full w-full flex-1 bg-primary transition-all', innerClassName)}
            style={`transform: translateX(-${100 - defaultProgress()}%)`}
        ></div>
    {/if}
</ProgressPrimitive.Root>
