<script lang="ts">
    import { settingsStore, type ThemeVibrancy } from '$lib/stores/settings'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    async function setVibrancy(vibrancy: ThemeVibrancy) {
        await settingsStore.updateSettings({ theme: { ...$settingsStore.theme, vibrancy } })
    }

    const options: { label: string; value: ThemeVibrancy }[] = [
        { label: 'Auto', value: 'Auto' },
        { label: 'Vibrant', value: 'Vibrant' },
        { label: 'Dark vibrant', value: 'DarkVibrant' },
        { label: 'Light vibrant', value: 'LightVibrant' },
        { label: 'Muted', value: 'Muted' },
        { label: 'Dark muted', value: 'DarkMuted' },
        { label: 'Light muted', value: 'LightMuted' }
    ]
</script>

<CustomSelect
    size="sm"
    tone="inherit"
    key="vibrancy"
    {options}
    selected={$settingsStore.theme.vibrancy}
    onValueChange={setVibrancy}
    class="w-[104px] min-w-0"
/>
