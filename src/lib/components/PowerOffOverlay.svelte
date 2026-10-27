<script lang="ts">
    import Keycaps from '$lib/components/Keycaps.svelte'
    import Logo from '$lib/components/Logo.svelte'

    let { onenable }: { onenable: () => void } = $props()
</script>

<button
    type="button"
    onclick={onenable}
    aria-label="Turn Chorus on"
    class="group flex h-[196px] w-[320px] cursor-pointer flex-col items-center justify-center gap-y-2 bg-ink text-ink-fg focus-visible:outline-none"
>
    <Logo
        size={30}
        tone="mono"
        class="transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110"
    />
    <span class="mt-1 text-[13px] font-semibold">Chorus is off</span>
    <span class="text-[11px] text-ink-muted transition-colors group-hover:text-ink-fg-2">
        Click anywhere to turn it on
    </span>
    <Keycaps combo="Alt+Shift+O" size="md" class="mt-1.5" />
</button>
