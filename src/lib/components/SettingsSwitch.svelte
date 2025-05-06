<script lang="ts">
    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import { type SettingsState, settingsStore, type SettingsKey } from '$lib/stores/settings'

    let {
        list,
        title,
        type,
        className,
        setLabel,
        handleCheckedChange
    }: {
        list: string[]
        title: string
        type: SettingsKey
        className?: string
        setLabel: (key: keyof SettingsState[SettingsKey]) => string
        handleCheckedChange: ({
            type,
            key
        }: {
            type: SettingsKey
            key: keyof SettingsState[SettingsKey]
        }) => void
    } = $props()
</script>

<div class="mr-2 flex w-1/2 flex-col gap-y-2 {className}">
    <h2 class="text-base font-semibold">{title}</h2>
    {#each list as key}
        <div class="flex items-center gap-2">
            <Switch
                checked={$settingsStore[type][key as keyof SettingsState[typeof type]]}
                onCheckedChange={() =>
                    handleCheckedChange({ type, key: key as keyof SettingsState[typeof type] })}
            />
            <Label>{setLabel(key as keyof SettingsState[typeof type])}</Label>
        </div>
    {/each}
</div>
