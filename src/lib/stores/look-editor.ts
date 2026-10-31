/**
 * What the look drawer is editing. The drawer (components/theming/LookDrawer)
 * sits over Spotify's live page, docked at the right of the main view, so the
 * page around it is the preview; the content script mounts it while this
 * store holds a draft and removes it when the draft is cleared. Opened from
 * the theme page, the page steps aside first (the drawer wants the real page
 * behind it) and comes back when the drawer closes.
 */
import { get, writable } from 'svelte/store'
import { remixLook, type Look } from '$lib/types/look'
import { closeThemePage, isThemeRoute, openThemePage } from '$lib/utils/theme-route'
import { duplicateWallpaper } from '$lib/utils/wallpapers'

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

/**
 * A copy of a look to edit as a new one, nothing stored until Save: a remix
 * of a built-in or a duplicate of one's own. A stored picture is copied under
 * the new look's own id first, so the two looks never share one (the editor
 * drops the copy again on Cancel).
 */
export async function remixForEditing(source: Look, name: string): Promise<Look> {
    const copy = remixLook(source, name)
    if (copy.backdrop?.kind === 'image' && copy.backdrop.source.type === 'file') {
        const id = `${copy.id}.${Date.now().toString(36)}`
        if (await duplicateWallpaper(copy.backdrop.source.id, id)) {
            copy.backdrop = { ...copy.backdrop, source: { type: 'file', id } }
        } else {
            copy.backdrop = null
        }
    }
    return copy
}

/** Close the drawer, and reopen the theme page when it was open before. */
export function closeLookEditor(): void {
    const current = get(lookEditing)
    lookEditing.set(null)
    if (current?.returnToPage) openThemePage()
}
