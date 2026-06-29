/**
 * Reflects the master on/off state on the toolbar action icon.
 *
 * Uses a path-based icon swap (color ↔ grayscale) rather than setIcon-with-imageData,
 * which is unavailable in MV3 service workers and Firefox. The grayscale set lives at
 * icon/disabled/*.png. Also updates the tooltip so the state is clear on hover.
 *
 * Call on every service-worker/event-page (re)start to restore the icon, since
 * setIcon state does not survive MV3 background termination.
 */
const ENABLED_ICONS = {
    16: 'icon/16.png',
    32: 'icon/32.png',
    48: 'icon/48.png',
    96: 'icon/96.png',
    128: 'icon/128.png'
}

const DISABLED_ICONS = {
    16: 'icon/disabled/16.png',
    32: 'icon/disabled/32.png',
    48: 'icon/disabled/48.png',
    96: 'icon/disabled/96.png',
    128: 'icon/disabled/128.png'
}

export async function applyActionIndicator(enabled: boolean): Promise<void> {
    try {
        await browser.action.setIcon({ path: enabled ? ENABLED_ICONS : DISABLED_ICONS })
    } catch (error) {
        console.warn('Failed to update action icon:', error)
    }

    try {
        await browser.action.setTitle({
            title: enabled
                ? 'Chorus - Spotify Enhancer'
                : 'Chorus is off — Alt+Shift+O to turn on'
        })
    } catch (error) {
        console.warn('Failed to update action title:', error)
    }
}
