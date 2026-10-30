/**
 * The optional `notifications` permission, from the popup's point of view.
 *
 * Chrome shows its permission prompt as a browser dialog, which takes focus
 * and closes the popup, so the code that asked is usually gone by the time
 * the user answers. `permissions.request` also has to run from the click in
 * an extension page: forwarded to the background worker it fails for want of
 * a user gesture. So the popup asks directly, notes that it asked, and on
 * every open compares the stored flag with what the browser says.
 */
import { browser } from 'wxt/browser'
import { storage } from '@wxt-dev/storage'
import { get } from 'svelte/store'
import { settingsStore } from '$lib/stores/settings'

/** Set while a request is in flight; survives the popup closing under the prompt. */
const ASKED_KEY = 'session:chorus_notifications_asked'

/** Whether the browser lets Chorus post notifications. Firefox grants it with the install. */
export async function hasNotificationPermission(): Promise<boolean> {
    if (import.meta.env.FIREFOX) return true
    try {
        return await browser.permissions.contains({ permissions: ['notifications'] })
    } catch {
        return false
    }
}

/** Ask for the permission. Call it from a click handler in the popup. */
export async function requestNotificationPermission(): Promise<boolean> {
    if (import.meta.env.FIREFOX) return true
    try {
        // Not awaited: the request must run inside the click's user activation.
        void storage.setItem<boolean>(ASKED_KEY, true)
        return await browser.permissions.request({ permissions: ['notifications'] })
    } catch (error) {
        console.error('[chorus] notification permission:', error)
        return false
    }
}

/**
 * Bring `notifications.granted` in line with the browser. A grant that
 * follows our own request also turns track notifications on, since that is
 * what allowing them meant; one made elsewhere (chrome://extensions) only
 * unlocks the switch.
 */
export async function syncNotificationPermission(): Promise<boolean> {
    const granted = await hasNotificationPermission()
    const current = get(settingsStore).notifications
    const asked = granted && (await storage.getItem<boolean>(ASKED_KEY)) === true
    if (asked) await storage.removeItem(ASKED_KEY)
    if (granted === current.granted && !asked) return granted
    await settingsStore.updateSettings({
        notifications: {
            ...current,
            granted,
            enabled: asked || (granted && current.enabled),
            on_track_change: asked || (granted && current.on_track_change)
        }
    })
    return granted
}

/** The one notification Chorus sends is on track change; both legacy flags move together. */
export async function setTrackNotifications(on: boolean): Promise<void> {
    const current = get(settingsStore).notifications
    await settingsStore.updateSettings({
        notifications: { ...current, enabled: on, on_track_change: on }
    })
}
