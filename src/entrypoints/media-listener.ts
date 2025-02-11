async function setupMediaListener() {
    function updatePlaybackSettings(playbackSettings: any) {
        document.dispatchEvent(new CustomEvent('FROM_SPEED_LISTENER', { detail: playbackSettings }))
    }

    const { chorus_playback_settings } = await chrome.storage.local.get('chorus_playback_settings')
    const {
        playbackRate = 1,
        preservesPitch = true,
        volume = 1,
        muted = false
    } = chorus_playback_settings

    updatePlaybackSettings({ playbackRate, preservesPitch, volume, muted })

    document.addEventListener('FROM_CHORUS_EXTENSION', (event: CustomEvent) => {
        updatePlaybackSettings(event.detail)
    })

    chrome.storage.onChanged.addListener((changes) => {
        for (let [key, { newValue }] of Object.entries(changes)) {
            if (key === 'chorus_playback_settings') {
                updatePlaybackSettings({
                    muted: newValue.muted,
                    volume: newValue.volume,
                    playbackRate: newValue.playbackRate,
                    preservesPitch: newValue.preservesPitch
                })
            }
        }
    })
}

export default defineUnlistedScript({
    main() {
        setupMediaListener()
        return true
    }
})
