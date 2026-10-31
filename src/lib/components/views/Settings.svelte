<script lang="ts">
    import { onMount } from 'svelte'
    import { settingsStore } from '$lib/stores/settings'
    import { playbackObserver } from '$lib/observers/playback'
    import type { SettingsState, SettingsKey } from '$lib/stores/settings'

    import SettingsSwitch from '$lib/components/SettingsSwitch.svelte'

    let pipSupported = $state(false)

    async function toggleSettings({
        type,
        key
    }: {
        type: SettingsKey
        key: keyof SettingsState[SettingsKey]
    }) {
        const enabled = !$settingsStore[type][key]

        await settingsStore.updateSettings({
            [type]: {
                ...$settingsStore[type],
                [key]: enabled
            }
        })

        if (key === 'progress') playbackObserver.toggleProgress()
        if (key === 'volume') playbackObserver.toggleVolumeSlider()
        if (key === 'playlist') playbackObserver.togglePlaylistButton()
        // 'theme' and 'glass' need nothing here: App.svelte re-applies the look
        // whenever settings change.
    }

    const UI_ITEMS = [
        {
            key: 'progress',
            label: 'Chorus progress bar',
            hint: 'Replaces Spotify’s seek bar with one that shows your snip'
        },
        {
            key: 'volume',
            label: 'Chorus volume slider',
            hint: 'Volume up to 300% with a reset point'
        },
        {
            key: 'pip',
            label: 'Picture-in-picture',
            hint: 'Float the player in its own window'
        },
        {
            key: 'playlist',
            label: 'Add-to-playlist button',
            hint: 'Spotify’s own button next to the track title'
        },
        {
            key: 'theme',
            label: 'Apply colour theme',
            hint: 'Recolour Spotify with the theme chosen in Settings'
        },
        {
            key: 'glass',
            label: 'Glass surfaces',
            hint: 'Translucent Chorus panels over a blurred view of what sits behind them'
        },
        {
            key: 'popup',
            label: 'Palette picker in popup',
            hint: 'Choose which album colour the popup uses'
        }
    ]

    const VIEW_ITEMS = [
        { key: 'presets', label: 'Presets' },
        { key: 'snip', label: 'Snip' },
        { key: 'speed', label: 'Speed' },
        { key: 'fx', label: 'Reverb' },
        { key: 'eq', label: 'EQ' },
        { key: 'ms', label: 'Stereo' },
        { key: 'seek', label: 'Seek' },
        { key: 'sleep', label: 'Sleep' }
    ]

    const uiItems = $derived(UI_ITEMS.filter((item) => item.key !== 'pip' || pipSupported))

    function checkIfPipSupported() {
        if (typeof window !== 'undefined' && 'pictureInPictureEnabled' in document) {
            pipSupported = document.pictureInPictureEnabled
        }
    }

    onMount(checkIfPipSupported)
</script>

<div class="grid grid-cols-2 gap-x-5">
    <SettingsSwitch title="Player bar" type="ui" items={uiItems} onToggle={toggleSettings} />
    <SettingsSwitch title="Tabs shown" type="views" items={VIEW_ITEMS} onToggle={toggleSettings} />
</div>
