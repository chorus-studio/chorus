<script lang="ts">
    import { settingsStore } from '$lib/stores/settings'
    import { FEATURES, setFeature } from '$lib/utils/features'
    import { cn } from '$lib/utils.js'

    // The Settings tab's footer: one lit dot per feature. Click to pause it
    // (the dot goes out, the name is struck through) and again to resume.
</script>

<div class="flex items-center gap-x-0.5" role="group" aria-label="Active features">
    <span class="rack-label pr-1.5">Active</span>
    {#each FEATURES as feature (feature.key)}
        {@const on = $settingsStore.features?.[feature.key] ?? true}
        <button
            type="button"
            aria-pressed={on}
            title={on ? feature.on : feature.off}
            onclick={() => setFeature(feature.key, !on)}
            class={cn(
                'chorus-focus inline-flex h-7 items-center gap-x-1.5 rounded-md px-2 text-xs transition-colors hover:bg-surface-2',
                on ? 'text-ink-fg-2 hover:text-ink-fg' : 'text-ink-muted line-through'
            )}
        >
            <span class="led {on ? '' : 'led-off'}"></span>
            {feature.label}
        </button>
    {/each}
</div>
