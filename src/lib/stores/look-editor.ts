/**
 * What the look drawer is editing. The drawer (components/theming/LookDrawer)
 * sits over Spotify's live page, docked at the right of the main view, so the
 * page around it is the preview; the content script mounts it while this
 * store holds a draft and removes it when the draft is cleared. Opened from
 * the theme page, the page steps aside first (the drawer wants the real page
 * behind it) and comes back when the drawer closes.
 */
import { get, writable } from 'svelte/store'
import type { Look } from '$lib/types/look'
import { closeThemePage, isThemeRoute, openThemePage } from '$lib/utils/theme-route'

export type LookEditing = {
    look: Look
    isNew: boolean
    /** Bring the theme page back when the drawer closes. */
    returnToPage: boolean
}

export const lookEditing = writable<LookEditing | null>(null)

/**
 * Open the drawer on a look. `returnToPage` defaults to whether the theme
 * page is open now; the settings dialog passes nothing and lands on the
 * plain page after.
 */
export function openLookEditor(
    look: Look,
    isNew: boolean,
    returnToPage: boolean = isThemeRoute(location.hash)
): void {
    if (isThemeRoute(location.hash)) closeThemePage()
    lookEditing.set({ look, isNew, returnToPage })
}

/** Close the drawer, and reopen the theme page when it was open before. */
export function closeLookEditor(): void {
    const current = get(lookEditing)
    lookEditing.set(null)
    if (current?.returnToPage) openThemePage()
}
