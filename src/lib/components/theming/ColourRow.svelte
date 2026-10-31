<script lang="ts">
    import { normaliseHex } from '$lib/utils/look-palette'
    import { Switch } from '$lib/components/ui/switch'

    // One colour as a row: a large swatch (the browser's picker behind it),
    // the name and what it paints, the hex to type into; with `auto` given,
    // an Auto switch beside it, and while that is on the colour is derived
    // and only the swatch shows.
    let {
        label,
        hint,
        value,
        onChange,
        auto,
        onAutoChange
    }: {
        label: string
        hint: string
        value: string
        onChange: (hex: string) => void
        /** Given: an Auto switch; on, the colour is derived and the hex field hides. */
        auto?: boolean
        onAutoChange?: (on: boolean) => void
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

<div
    class="flex min-h-12 items-center gap-x-3 rounded-[10px] border border-hairline bg-inset px-3 py-2"
>
    <span
        class="relative size-8 shrink-0 overflow-hidden rounded-lg border border-hairline"
        style="background: {value}"
    >
        <input
            type="color"
            {value}
            disabled={auto}
            oninput={(e) => onChange(e.currentTarget.value)}
            class="absolute -inset-2 size-[calc(100%+16px)] cursor-pointer opacity-0 disabled:cursor-default"
            aria-label="{label} colour"
        />
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-y-0.5">
        <span class="text-[13px] font-semibold text-ink-fg">{label}</span>
        <span class="text-xs leading-snug text-ink-muted">{hint}</span>
    </div>
    {#if !auto}
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
            class="h-[30px] w-[88px] shrink-0 rounded-md border border-hairline bg-ink/40 px-2 font-mono text-xs text-ink-fg outline-none placeholder:text-ink-dim focus-visible:border-signal/60"
            aria-label="{label} hex"
        />
    {/if}
    {#if auto !== undefined}
        <label class="flex shrink-0 items-center gap-x-2 text-[13px] text-ink-fg-2">
            <Switch
                checked={auto}
                onCheckedChange={(on) => onAutoChange?.(on)}
                aria-label="Pick the {label.toLowerCase()} colour automatically"
            />
            Auto
        </label>
    {/if}
</div>
