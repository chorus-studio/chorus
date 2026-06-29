<script lang="ts">
    import { Power } from 'lucide-svelte'

    let { onenable }: { onenable: () => void } = $props()
</script>

<button
    type="button"
    onclick={onenable}
    aria-label="Turn Chorus on"
    class="group flex h-[170px] w-[300px] cursor-pointer flex-col items-center justify-center gap-2 bg-[var(--bg)] text-[var(--text)]"
>
    <Power
        size={40}
        class="opacity-60 transition-all duration-150 group-hover:scale-110 group-hover:opacity-100"
    />
    <span class="text-sm font-semibold">Chorus is off</span>
    <span class="text-xs opacity-60 transition-opacity group-hover:opacity-90">
        Click anywhere to turn on
    </span>
</button>
