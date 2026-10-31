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
        class: className = ''
    }: {
        label: string
        value: string
        onChange: (hex: string) => void
        /** The value was derived, not chosen; shown as a hint beside it. */
        auto?: boolean
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
        'inline-flex h-7 items-center gap-x-1.5 rounded-md border border-hairline bg-inset px-1 focus-within:border-signal/60 hover:border-hairline-strong',
        className
    )}
>
    <span
        class="relative size-5 shrink-0 overflow-hidden rounded-[4px] border border-hairline"
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
    <span class="text-[11px] text-ink-fg-2">{label}</span>
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
        class="w-[58px] bg-transparent font-mono text-[11px] text-ink-fg outline-none placeholder:text-ink-dim"
        aria-label="{label} hex"
    />
    {#if auto}
        <span class="pr-0.5 font-mono text-[9px] uppercase tracking-wider text-signal">auto</span>
    {/if}
</label>
