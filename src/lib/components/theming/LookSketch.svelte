<script lang="ts">
    import type { Sketch } from '$lib/utils/look-preview'
    import { cn } from '$lib/utils.js'

    // A rough sketch of the page at 136 × 96: top bar, library and main view,
    // player bar, all panels on the frame (or on the look's backdrop). The
    // Theme tab's cards and the editor's preview both draw it.
    let {
        sketch,
        selected = false,
        class: className = ''
    }: { sketch: Sketch; selected?: boolean; class?: string } = $props()

    const c = $derived(sketch.colours)
</script>

<span
    class={cn(
        'relative block h-24 w-full overflow-hidden rounded-lg border border-hairline transition-shadow',
        selected && 'ring-2 ring-signal',
        className
    )}
    style="background: {sketch.backdrop ?? c.frame}"
>
    <!-- top bar: home button, search field, two icons -->
    <span
        class="absolute left-1.5 right-1.5 top-1.5 h-[11px] rounded-[3px]"
        style="background: {sketch.panel}"
    ></span>
    <span
        class="absolute left-[calc(50%-23px)] top-[9px] size-[5px] rounded-full"
        style="background: {c.card}"
    ></span>
    <span
        class="absolute left-[calc(50%-15px)] top-[9px] h-[5px] w-9 rounded-full"
        style="background: {c.card}"
    ></span>
    <span
        class="absolute right-[14px] top-2.5 size-[3px] rounded-full opacity-70"
        style="background: {c.text}"
    ></span>
    <span
        class="absolute right-2 top-2.5 size-[3px] rounded-full opacity-70"
        style="background: {c.text}"
    ></span>

    <!-- library: three rows of cover and title -->
    <span
        class="absolute bottom-[21px] left-1.5 top-[21px] w-6 rounded-[3px]"
        style="background: {sketch.panel}"
    ></span>
    {#each [26, 34, 42] as top (top)}
        <span
            class="absolute left-2.5 size-[5px] rounded-[1px]"
            style="top: {top}px; background: {c.card}"
        ></span>
        <span
            class="absolute left-[17px] h-0.5 w-[9px] rounded-sm opacity-60"
            style="top: {top + 1.5}px; background: {c.subtext}"
        ></span>
    {/each}

    <!-- main view: header with cover and title, play button, three rows -->
    <span
        class="absolute bottom-[21px] left-[34px] right-1.5 top-[21px] rounded-[3px]"
        style="background: {sketch.panel}"
    ></span>
    <span class="absolute left-[39px] top-[26px] size-3 rounded-[2px]" style="background: {c.card}"
    ></span>
    <span
        class="absolute left-[55px] top-[27px] h-[3px] w-[30px] rounded-sm"
        style="background: {c.text}"
    ></span>
    <span
        class="absolute left-[55px] top-[33px] h-0.5 w-[18px] rounded-sm opacity-70"
        style="background: {c.subtext}"
    ></span>
    <span
        class="absolute left-[39px] top-[43px] size-[7px] rounded-full"
        style="background: {c.button}"
    ></span>
    {#each [55, 61, 67] as top (top)}
        <span
            class="absolute left-[39px] right-3 h-0.5 rounded-sm opacity-40"
            style="top: {top}px; background: {c.subtext}"
        ></span>
    {/each}

    <!-- player bar: cover and title, transport, two icons -->
    <span
        class="absolute bottom-1.5 left-1.5 right-1.5 h-[11px] rounded-[3px]"
        style="background: {sketch.panel}"
    ></span>
    <span class="absolute bottom-2 left-[9px] size-[7px] rounded-[1px]" style="background: {c.card}"
    ></span>
    <span
        class="absolute bottom-[10px] left-[19px] h-0.5 w-3.5 rounded-sm"
        style="background: {c.text}"
    ></span>
    <span
        class="absolute bottom-[10px] left-[calc(50%-12px)] size-[3px] rounded-full"
        style="background: {c.subtext}"
    ></span>
    <span
        class="absolute bottom-2 left-[calc(50%-3px)] size-1.5 rounded-full"
        style="background: {c.text}"
    ></span>
    <span
        class="absolute bottom-[10px] left-[calc(50%+9px)] size-[3px] rounded-full"
        style="background: {c.subtext}"
    ></span>
    <span
        class="absolute bottom-[10px] right-[14px] size-[3px] rounded-full"
        style="background: {c.subtext}"
    ></span>
    <span
        class="absolute bottom-[10px] right-2 size-[3px] rounded-full"
        style="background: {c.subtext}"
    ></span>
</span>
