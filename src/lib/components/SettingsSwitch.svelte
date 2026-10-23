<script lang="ts">
    import { Switch } from '$lib/components/ui/switch'
    import { type SettingsState, settingsStore, type SettingsKey } from '$lib/stores/settings'

    // A titled list of switch rows for one settings group.
    let {
        title,
        type,
        items,
        onToggle
    }: {
        title: string
        type: SettingsKey
        items: Array<{ key: string; label: string; hint?: string }>
        onToggle: (args: { type: SettingsKey; key: keyof SettingsState[SettingsKey] }) => void
    } = $props()
</script>

<div class="flex min-w-0 flex-col gap-y-0.5">
    <span class="rack-label flex h-[18px] items-center">{title}</span>
    {#each items as item (item.key)}
        {@const checked = Boolean(
            $settingsStore[type][item.key as keyof SettingsState[typeof type]]
        )}
        <label
            class="flex h-[26px] cursor-pointer items-center justify-between gap-x-2 text-xs {checked
                ? 'text-ink-fg-2'
                : 'text-ink-muted'}"
            title={item.hint}
        >
            <span class="truncate">{item.label}</span>
            <Switch
                {checked}
                aria-label={item.label}
                onCheckedChange={() =>
                    onToggle({ type, key: item.key as keyof SettingsState[typeof type] })}
            />
        </label>
    {/each}
</div>
