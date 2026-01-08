<script lang="ts">
    import type { CSSVariable } from '$lib/utils/theming'
    import ColorPickerField from './ColorPickerField.svelte'

    interface Props {
        colors: Record<CSSVariable, string>
    }

    // Default colors for initialization
    const defaultColors: Record<CSSVariable, string> = {
        text: '#ffffff',
        subtext: '#b3b3b3',
        main: '#121212',
        sidebar: '#121212',
        player: '#181818',
        card: '#282828',
        shadow: '#000000',
        selected_row: '#1ed760',
        button: '#1ed760',
        button_active: '#1ed760',
        button_disabled: '#535353',
        tab_active: '#333333',
        notification: '#4687d6',
        notification_error: '#e22134',
        misc: '#7f7f7f'
    }

    let { colors = $bindable(defaultColors) }: Props = $props()

    // CSS variables with labels and descriptions
    const colorFields: { key: CSSVariable; label: string; description: string }[] = [
        { key: 'text', label: 'Text', description: 'Main text, playlist names, headings' },
        { key: 'subtext', label: 'Subtext', description: 'Secondary text, artist names, mini info' },
        { key: 'main', label: 'Main', description: 'Main field background' },
        { key: 'sidebar', label: 'Sidebar', description: 'Sidebar background' },
        { key: 'player', label: 'Player', description: 'Player bar background' },
        { key: 'card', label: 'Card', description: 'Card background on hover' },
        { key: 'shadow', label: 'Shadow', description: 'Card drop shadow, button background' },
        {
            key: 'selected_row',
            label: 'Selected Row',
            description: 'Selected song, scrollbar, playlist details'
        },
        { key: 'button', label: 'Button', description: 'Play button, like button, menus' },
        { key: 'button_active', label: 'Button Active', description: 'Active play button' },
        {
            key: 'button_disabled',
            label: 'Button Disabled',
            description: 'Seekbar and volume bar background'
        },
        { key: 'tab_active', label: 'Tab Active', description: 'Active tab indicator in header' },
        { key: 'notification', label: 'Notification', description: 'Notification toast background' },
        {
            key: 'notification_error',
            label: 'Error',
            description: 'Error notification toast background'
        },
        { key: 'misc', label: 'Misc', description: 'Miscellaneous elements' }
    ]

    // Handler to update a specific color
    function updateColor(key: CSSVariable, value: string) {
        colors = { ...colors, [key]: value }
    }
</script>

<div class="flex flex-col gap-4">
    <p class="text-sm text-muted-foreground">
        Customize all 15 color variables that control the Spotify interface.
    </p>

    <div class="grid grid-cols-2 gap-3">
        {#each colorFields as field (field.key)}
            <ColorPickerField
                label={field.label}
                description={field.description}
                value={colors[field.key] ?? defaultColors[field.key]}
                onchange={(v) => updateColor(field.key, v)}
            />
        {/each}
    </div>
</div>
