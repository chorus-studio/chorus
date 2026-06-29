import { storage } from '@wxt-dev/storage'

/**
 * Master on/off switch for the extension. When disabled, the content script
 * tears down all injected Chorus UI, removes the active theme, and resets media
 * overrides back to their defaults. Persisted so the choice survives reloads and
 * stays in sync across the background, popup, and content script via storage.watch.
 */
export const ENABLED_STORE_KEY = 'local:chorus_enabled' as const

// Default ON so existing users see no change after updating.
const DEFAULT_ENABLED = true

export async function getEnabled(): Promise<boolean> {
    const value = await storage.getItem<boolean>(ENABLED_STORE_KEY)
    return value ?? DEFAULT_ENABLED
}

export async function setEnabled(enabled: boolean): Promise<void> {
    await storage.setItem<boolean>(ENABLED_STORE_KEY, enabled)
}

export async function toggleEnabled(): Promise<boolean> {
    const next = !(await getEnabled())
    await setEnabled(next)
    return next
}

export function watchEnabled(callback: (enabled: boolean) => void) {
    return storage.watch<boolean>(ENABLED_STORE_KEY, (value) => {
        callback(value ?? DEFAULT_ENABLED)
    })
}
