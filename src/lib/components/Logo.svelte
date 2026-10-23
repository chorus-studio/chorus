<script lang="ts">
    // The Chorus mark: a "C" of nested phase-offset arcs radiating from a voice dot.
    let {
        size = 20,
        tone = 'signal',
        class: className = ''
    }: { size?: number; tone?: 'signal' | 'current' | 'mono'; class?: string } = $props()

    const arc = $derived(
        tone === 'current' ? 'currentColor' : tone === 'mono' ? '#8a8793' : 'hsl(var(--signal))'
    )
    const dot = $derived(
        tone === 'current' ? 'currentColor' : tone === 'mono' ? '#8a8793' : 'hsl(var(--ink-fg))'
    )
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    class={className}
>
    <path
        d="M107.2 36.97A51 51 0 1 0 107.2 91.03"
        stroke={arc}
        stroke-width="14"
        stroke-linecap="round"
    />
    <path
        d="M86.98 44.72A30 30 0 1 0 86.98 83.28"
        stroke={arc}
        stroke-width="14"
        stroke-linecap="round"
    />
    <circle cx="64" cy="64" r="10" fill={dot} />
</svg>
