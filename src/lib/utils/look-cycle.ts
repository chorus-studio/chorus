/**
 * The keyboard shortcuts that step through themes walk the visible built-in
 * palettes first, then the visible looks (built-in, then the person's own),
 * and wrap. Pure, so the background worker and the tests share it.
 */
import type { Look } from '$lib/types/look'
import type { ThemeName } from '$lib/utils/theming'

/** What `settings.theme` holds of the choice: a palette name, and a look id when a look is on. */
export type LookChoice = { name: ThemeName; look: string | null }

export function cycleLook(
    current: LookChoice,
    direction: 'next' | 'previous',
    options: { names: ThemeName[]; looks: Look[] }
): LookChoice {
    const entries: LookChoice[] = [
        ...options.names.map((name) => ({ name, look: null })),
        ...options.looks.map((look) => ({ name: current.name, look: look.id }))
    ]
    if (!entries.length) return current
    const index = current.look
        ? entries.findIndex((entry) => entry.look === current.look)
        : entries.findIndex((entry) => entry.look === null && entry.name === current.name)
    const step = direction === 'next' ? 1 : -1
    const at =
        index < 0
            ? direction === 'next'
                ? 0
                : entries.length - 1
            : (index + step + entries.length) % entries.length
    return entries[at]
}
