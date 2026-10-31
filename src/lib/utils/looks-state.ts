/**
 * Reading the saved looks without a Svelte store: the content script's first
 * paint and the background worker (keyboard cycling) need the list, not a
 * subscription. stores/looks.ts builds on these.
 */
import { storage } from '@wxt-dev/storage'
import { BUILTIN_LOOKS, builtinLook, type Look, type LooksState } from '$lib/types/look'

export const LOOKS_STORE_KEY = 'local:chorus_looks'

/** Whatever storage holds, brought to the current shape without dropping a single look. */
export function sanitiseLooks(stored: unknown): LooksState {
    const raw = (stored ?? {}) as Partial<LooksState>
    const looks: Record<string, Look> = {}
    if (raw.looks && typeof raw.looks === 'object') {
        for (const [id, look] of Object.entries(raw.looks)) {
            if (look && typeof look === 'object' && typeof look.name === 'string') {
                looks[id] = { ...look, id, builtIn: undefined }
            }
        }
    }
    return {
        version: 1,
        looks,
        hiddenBuiltIn: Array.isArray(raw.hiddenBuiltIn)
            ? raw.hiddenBuiltIn.filter((id): id is string => typeof id === 'string')
            : []
    }
}

export async function readLooksState(): Promise<LooksState> {
    return sanitiseLooks(await storage.getItem<LooksState>(LOOKS_STORE_KEY))
}

/** A look by id, the person's own first, else a built-in. */
export function findLook(
    state: LooksState | null | undefined,
    id: string | null | undefined
): Look | undefined {
    if (!id) return undefined
    return state?.looks[id] ?? builtinLook(id)
}

/** The person's own looks, most recently changed first. */
export function ownLooks(state: LooksState): Look[] {
    return Object.values(state.looks).sort((a, b) => b.updatedAt - a.updatedAt)
}

/** The built-in looks not hidden. */
export function visibleBuiltinLooks(state: LooksState): Look[] {
    return BUILTIN_LOOKS.filter((look) => !state.hiddenBuiltIn.includes(look.id))
}
