<script lang="ts">
    import { normaliseHex } from '$lib/utils/look-palette'
    import { cn } from '$lib/utils.js'

    // A swatch (the browser's own colour picker behind it) with the hex beside
    // it, editable by hand; a typed value lands on blur or Enter once it parses.
    let {
        label,
        value,
        onChange,
        auto = false,
        size = 'sm',
        hideLabel = false,
        class: className = ''
    }: {
        label: string
        value: string
        onChange: (hex: string) => void
        /** The value was derived, not chosen; shown as a hint beside it. */
        auto?: boolean
        /** `lg`: a taller chip with a bigger swatch, for rows that stand on their own. */
        size?: 'sm' | 'lg'
        /** Keep the label for assistive tech only (a numbered stop beside its slider). */
        hideLabel?: boolean
        class?: string
    } = $props()

    let text = $state(value)
    $effect(() => {
        text = value
    })

    function commit() {
        const hex = normaliseHex(text)
        if (hex && hex !== value) onChange(hex)
        else text = value
    }
</script>

<label
    class={cn(
        'inline-flex items-center rounded-md border border-hairline bg-inset focus-within:border-signal/60 hover:border-hairline-strong',
        size === 'lg' ? 'h-[30px] gap-x-2 px-1.5' : 'h-7 gap-x-1.5 px-1',
        className
    )}
>
    <span
        class="relative shrink-0 overflow-hidden border border-hairline {size === 'lg'
            ? 'size-6 rounded-[5px]'
            : 'size-5 rounded-[4px]'}"
        style="background: {value}"
    >
        <input
            type="color"
            {value}
            oninput={(e) => onChange(e.currentTarget.value)}
            class="absolute -inset-2 size-[calc(100%+16px)] cursor-pointer opacity-0"
            aria-label="{label} colour"
        />
    </span>
    {#if !hideLabel}
        <span class="text-[11px] text-ink-fg-2">{label}</span>
    {/if}
    <input
        type="text"
        bind:value={text}
        onblur={commit}
        onkeydown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                commit()
            }
        }}
        spellcheck="false"
        maxlength="7"
        class="bg-transparent font-mono text-ink-fg outline-none placeholder:text-ink-dim {size ===
        'lg'
            ? 'w-[66px] text-xs'
            : 'w-[58px] text-[11px]'}"
        aria-label="{label} hex"
    />
    {#if auto}
        <span class="pr-0.5 font-mono text-[9px] uppercase tracking-wider text-signal">auto</span>
    {/if}
</label>
