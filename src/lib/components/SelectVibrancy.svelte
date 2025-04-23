<script lang="ts">
    import { settingsStore, type ThemeVibrancy } from '$lib/stores/settings'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    async function setVibrancy(vibrancy: ThemeVibrancy) {
        await settingsStore.updateSettings({ theme: { ...$settingsStore.theme, vibrancy } })
    }

    const options: { label: string; value: ThemeVibrancy }[] = [
        { label: 'Auto', value: 'Auto' },
        { label: 'Vibrant', value: 'Vibrant' },
        { label: 'DarkVibrant', value: 'DarkVibrant' },
        { label: 'LightVibrant', value: 'LightVibrant' },
        { label: 'Muted', value: 'Muted' },
        { label: 'DarkMuted', value: 'DarkMuted' },
        { label: 'LightMuted', value: 'LightMuted' }
    ]
</script>

<CustomSelect
    size="sm"
    {options}
    selected={$settingsStore.theme.vibrancy}
    onValueChange={setVibrancy}
/>
