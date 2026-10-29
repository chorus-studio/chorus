<script lang="ts">
    import { configStore } from '$lib/stores/config'
    import { Switch } from '$lib/components/ui/switch'

    const SWITCH_ROW = 'flex h-6 items-center gap-x-2 text-xs text-ink-fg-2'
    const HINT = 'text-xs leading-snug text-ink-muted'

    const toggleLimiter = (checked: boolean) =>
        void configStore.updateConfig({ output_limiter: checked })
</script>

<div class="flex flex-col gap-y-5">
    <div class="flex flex-col gap-y-1.5">
        <span class="rack-label">Output limiter</span>
        <label class={SWITCH_ROW}>
            <Switch
                checked={$configStore.output_limiter}
                onCheckedChange={toggleLimiter}
                aria-label="Output limiter"
            />
            {$configStore.output_limiter ? 'On' : 'Off'}
        </label>
        <span class={HINT}>
            Catches peaks that would clip when effects add level, for 6 ms of delay. Switch it off
            to compare; nothing else in the chain changes.
        </span>
    </div>
</div>
