/**
 * A person's own looks (types/look.ts) and which built-ins they have hidden,
 * kept in extension storage so the page, the popup and the PiP window all
 * see the same list. Image bytes live apart, in the wallpaper store.
 */
import { storage } from '@wxt-dev/storage'
import { writable, get } from 'svelte/store'
import {
    BUILTIN_LOOKS,
    DEFAULT_LOOKS_STATE,
    isBuiltinLook,
    type Look,
    type LooksState
} from '$lib/types/look'
import { deleteWallpaper, readWallpaper, writeStoredWallpaper } from '$lib/utils/wallpapers'
import { LOOKS_STORE_KEY, findLook, sanitiseLooks } from '$lib/utils/looks-state'
import {
    adoptLook,
    lookFileName,
    lookWallpaperId,
    serialiseLookFile,
    type ParsedLookFile
} from '$lib/utils/look-file'

export {
    LOOKS_STORE_KEY,
    findLook,
    ownLooks,
    readLooksState,
    visibleBuiltinLooks
} from '$lib/utils/looks-state'

function createLooksStore() {
    const store = writable<LooksState>(DEFAULT_LOOKS_STATE)
    const { subscribe, set, update } = store
    let writing = false

    async function persist(): Promise<void> {
        writing = true
        try {
            await storage.setItem<LooksState>(LOOKS_STORE_KEY, get(store))
        } catch (error) {
            console.error('[chorus] could not save looks:', error)
        } finally {
            writing = false
        }
    }

    /** `base`, or `base 2`, `base 3`… until no look (built-in or own) carries the name. */
    function uniqueName(base: string, exceptId?: string): string {
        const taken = new Set(
            [...BUILTIN_LOOKS, ...Object.values(get(store).looks)]
                .filter((look) => look.id !== exceptId)
                .map((look) => look.name.trim().toLowerCase())
        )
        const clean = base.trim() || 'New look'
        if (!taken.has(clean.toLowerCase())) return clean
        for (let n = 2; ; n++) {
            const candidate = `${clean} ${n}`
            if (!taken.has(candidate.toLowerCase())) return candidate
        }
    }

    /** Add or replace one of the person's looks; the name is made unique and the clock stamped. */
    async function saveLook(look: Look): Promise<Look> {
        const saved: Look = {
            ...look,
            builtIn: undefined,
            name: uniqueName(look.name, look.id),
            updatedAt: Date.now()
        }
        update((state) => ({ ...state, looks: { ...state.looks, [saved.id]: saved } }))
        await persist()
        return saved
    }

    async function deleteLook(id: string): Promise<void> {
        const look = get(store).looks[id]
        if (!look) return
        update((state) => {
            const looks = { ...state.looks }
            delete looks[id]
            return { ...state, looks }
        })
        await persist()
        if (look.backdrop?.kind === 'image' && look.backdrop.source.type === 'file') {
            await deleteWallpaper(look.backdrop.source.id)
        }
    }

    /** A look read from a file, taken in as one of the person's own, picture and all. */
    async function importLook(parsed: ParsedLookFile): Promise<Look> {
        const id = crypto.randomUUID()
        const wallpaperId = `${id}.${Date.now().toString(36)}`
        const look = adoptLook(parsed, id, wallpaperId)
        if (parsed.wallpaper && lookWallpaperId(look) === wallpaperId) {
            await writeStoredWallpaper(wallpaperId, parsed.wallpaper)
        }
        return saveLook(look)
    }

    /** A look (any, built-in included) as a file's name and text, its picture inside. */
    async function exportLook(
        id: string,
        version: string
    ): Promise<{ name: string; text: string } | null> {
        const look = findLook(get(store), id)
        if (!look) return null
        const wallpaperId = lookWallpaperId(look)
        const wallpaper = wallpaperId ? await readWallpaper(wallpaperId) : null
        return { name: lookFileName(look), text: serialiseLookFile(look, version, wallpaper) }
    }

    /** Hide or show a built-in palette or look on the Theme tab. */
    async function setHidden(id: string, hidden: boolean): Promise<void> {
        update((state) => ({
            ...state,
            hiddenBuiltIn: hidden
                ? [...new Set([...state.hiddenBuiltIn, id])]
                : state.hiddenBuiltIn.filter((x) => x !== id)
        }))
        await persist()
    }

    storage.getItem<LooksState>(LOOKS_STORE_KEY).then((stored) => {
        if (stored) set(sanitiseLooks(stored))
    })
    storage.watch<LooksState>(LOOKS_STORE_KEY, (stored) => {
        if (writing) return
        set(sanitiseLooks(stored))
    })

    return {
        subscribe,
        saveLook,
        deleteLook,
        importLook,
        exportLook,
        setHidden,
        uniqueName
    }
}

export const looksStore = createLooksStore()
export { isBuiltinLook }
