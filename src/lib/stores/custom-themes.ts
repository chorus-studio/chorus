import { storage } from '@wxt-dev/storage'
import { writable, derived, get } from 'svelte/store'
import { syncWithType } from '$lib/utils/store-utils'
import { THEME_NAMES, STATIC_THEMES, type ThemeName } from '$lib/utils/theming'
import type {
    CustomTheme,
    CustomThemesState,
    ColorTheme,
    ImageTheme,
    GradientTheme,
    ThemeListItem
} from '$lib/types/custom-theme'
import { DEFAULT_CUSTOM_THEMES_STATE } from '$lib/types/custom-theme'

export const CUSTOM_THEMES_STORE_KEY = 'local:chorus_custom_themes'

function createCustomThemesStore() {
    const store = writable<CustomThemesState>(DEFAULT_CUSTOM_THEMES_STATE)
    const { subscribe, update, set } = store

    let isUpdatingStorage = false

    // Persist state to storage
    async function persistState(): Promise<void> {
        const currentState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<CustomThemesState>(CUSTOM_THEMES_STORE_KEY, currentState)
        } catch (error) {
            console.error('Error persisting custom themes:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    // Validate theme name uniqueness
    function isNameUnique(name: string, excludeId?: string): boolean {
        const state = get(store)
        const normalizedName = name.trim().toLowerCase()

        // Check against built-in theme names
        const builtInNames = THEME_NAMES.map((n) => n.toLowerCase().replace(/_/g, ' '))
        if (builtInNames.includes(normalizedName)) {
            return false
        }

        // Check against existing custom themes
        return !Object.values(state.themes).some(
            (t) => t.name.toLowerCase() === normalizedName && t.id !== excludeId
        )
    }

    // Create a new custom theme
    async function createTheme(
        theme: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<{ success: boolean; theme?: CustomTheme; error?: string }> {
        if (!theme.name.trim()) {
            return { success: false, error: 'Theme name is required' }
        }

        if (!isNameUnique(theme.name)) {
            return { success: false, error: 'A theme with this name already exists' }
        }

        const now = Date.now()
        const newTheme: CustomTheme = {
            ...theme,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        } as CustomTheme

        update((state) => ({
            ...state,
            themes: {
                ...state.themes,
                [newTheme.id]: newTheme
            }
        }))

        await persistState()
        return { success: true, theme: newTheme }
    }

    // Update an existing theme
    async function updateTheme(
        id: string,
        updates: Partial<Omit<CustomTheme, 'id' | 'createdAt' | 'type'>>
    ): Promise<{ success: boolean; error?: string }> {
        const state = get(store)
        const existing = state.themes[id]

        if (!existing) {
            return { success: false, error: 'Theme not found' }
        }

        if (updates.name && !isNameUnique(updates.name, id)) {
            return { success: false, error: 'A theme with this name already exists' }
        }

        update((state) => ({
            ...state,
            themes: {
                ...state.themes,
                [id]: {
                    ...existing,
                    ...updates,
                    updatedAt: Date.now()
                } as CustomTheme
            }
        }))

        await persistState()
        return { success: true }
    }

    // Delete a custom theme
    async function deleteTheme(id: string): Promise<boolean> {
        const state = get(store)
        if (!state.themes[id]) return false

        update((state) => {
            const { [id]: _, ...remainingThemes } = state.themes
            return {
                ...state,
                themes: remainingThemes,
                activeCustomThemeId: state.activeCustomThemeId === id ? null : state.activeCustomThemeId
            }
        })

        await persistState()
        return true
    }

    // Hide a theme
    async function hideTheme(identifier: string, isBuiltIn: boolean): Promise<void> {
        update((state) => {
            if (isBuiltIn) {
                if (state.hiddenBuiltIn.includes(identifier)) return state
                return {
                    ...state,
                    hiddenBuiltIn: [...state.hiddenBuiltIn, identifier]
                }
            } else {
                const theme = state.themes[identifier]
                if (!theme || theme.hidden) return state
                return {
                    ...state,
                    themes: {
                        ...state.themes,
                        [identifier]: { ...theme, hidden: true }
                    }
                }
            }
        })

        await persistState()
    }

    // Unhide a theme
    async function unhideTheme(identifier: string, isBuiltIn: boolean): Promise<void> {
        update((state) => {
            if (isBuiltIn) {
                return {
                    ...state,
                    hiddenBuiltIn: state.hiddenBuiltIn.filter((id) => id !== identifier)
                }
            } else {
                const theme = state.themes[identifier]
                if (!theme || !theme.hidden) return state
                return {
                    ...state,
                    themes: {
                        ...state.themes,
                        [identifier]: { ...theme, hidden: false }
                    }
                }
            }
        })

        await persistState()
    }

    // Get theme by ID
    function getThemeById(id: string): CustomTheme | undefined {
        return get(store).themes[id]
    }

    // Set active custom theme
    async function setActiveTheme(id: string | null): Promise<void> {
        update((state) => ({
            ...state,
            activeCustomThemeId: id
        }))

        await persistState()
    }

    // Search themes by name
    function searchThemes(query: string): CustomTheme[] {
        const state = get(store)
        const lowerQuery = query.toLowerCase()
        return Object.values(state.themes).filter((t) => t.name.toLowerCase().includes(lowerQuery))
    }

    // Get all custom themes as array
    function getCustomThemes(): CustomTheme[] {
        return Object.values(get(store).themes)
    }

    // Initialize from storage
    storage.getItem<CustomThemesState>(CUSTOM_THEMES_STORE_KEY).then((stored) => {
        if (!stored) return

        const synced = syncWithType(stored, DEFAULT_CUSTOM_THEMES_STATE)
        set(synced)

        // Persist synced state
        isUpdatingStorage = true
        storage
            .setItem<CustomThemesState>(CUSTOM_THEMES_STORE_KEY, synced)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    // Watch for external changes
    storage.watch<CustomThemesState>(CUSTOM_THEMES_STORE_KEY, (stored) => {
        if (!stored || isUpdatingStorage) return
        const synced = syncWithType(stored, DEFAULT_CUSTOM_THEMES_STATE)
        set(synced)
    })

    return {
        subscribe,
        createTheme,
        updateTheme,
        deleteTheme,
        hideTheme,
        unhideTheme,
        getThemeById,
        setActiveTheme,
        searchThemes,
        getCustomThemes,
        isNameUnique,
        getState: () => get(store)
    }
}

export const customThemesStore = createCustomThemesStore()

// Derived store for visible themes (custom first, then built-in)
export const visibleThemes = derived(customThemesStore, ($store): ThemeListItem[] => {
    // Get visible custom themes
    const customThemes: ThemeListItem[] = Object.values($store.themes)
        .filter((t) => !t.hidden)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => ({
            id: t.id,
            name: t.name,
            isBuiltIn: false,
            hidden: t.hidden,
            type: t.type,
            previewColors:
                t.type === 'color'
                    ? {
                          shadow: (t as ColorTheme).colors.shadow,
                          sidebar: (t as ColorTheme).colors.sidebar,
                          text: (t as ColorTheme).colors.text
                      }
                    : undefined
        }))

    // Get visible built-in themes
    const builtInThemes: ThemeListItem[] = THEME_NAMES.filter(
        (name) => !$store.hiddenBuiltIn.includes(name)
    ).map((name) => ({
        id: name,
        name: name.replace(/_/g, ' '),
        isBuiltIn: true,
        hidden: false,
        previewColors: STATIC_THEMES[name]
            ? {
                  shadow: STATIC_THEMES[name]!.shadow,
                  sidebar: STATIC_THEMES[name]!.sidebar,
                  text: STATIC_THEMES[name]!.text
              }
            : undefined
    }))

    // Custom first, then built-in
    return [...customThemes, ...builtInThemes]
})

// Derived store for hidden themes
export const hiddenThemes = derived(customThemesStore, ($store): ThemeListItem[] => {
    // Get hidden custom themes
    const hiddenCustom: ThemeListItem[] = Object.values($store.themes)
        .filter((t) => t.hidden)
        .map((t) => ({
            id: t.id,
            name: t.name,
            isBuiltIn: false,
            hidden: true,
            type: t.type
        }))

    // Get hidden built-in themes
    const hiddenBuiltIn: ThemeListItem[] = $store.hiddenBuiltIn.map((name) => ({
        id: name,
        name: name.replace(/_/g, ' '),
        isBuiltIn: true,
        hidden: true,
        previewColors: STATIC_THEMES[name as ThemeName]
            ? {
                  shadow: STATIC_THEMES[name as ThemeName]!.shadow,
                  sidebar: STATIC_THEMES[name as ThemeName]!.sidebar,
                  text: STATIC_THEMES[name as ThemeName]!.text
              }
            : undefined
    }))

    return [...hiddenCustom, ...hiddenBuiltIn]
})

// Derived store for all themes (for search)
export const allThemes = derived(customThemesStore, ($store): ThemeListItem[] => {
    // All custom themes
    const customThemes: ThemeListItem[] = Object.values($store.themes).map((t) => ({
        id: t.id,
        name: t.name,
        isBuiltIn: false,
        hidden: t.hidden,
        type: t.type,
        previewColors:
            t.type === 'color'
                ? {
                      shadow: (t as ColorTheme).colors.shadow,
                      sidebar: (t as ColorTheme).colors.sidebar,
                      text: (t as ColorTheme).colors.text
                  }
                : undefined
    }))

    // All built-in themes
    const builtInThemes: ThemeListItem[] = THEME_NAMES.map((name) => ({
        id: name,
        name: name.replace(/_/g, ' '),
        isBuiltIn: true,
        hidden: $store.hiddenBuiltIn.includes(name),
        previewColors: STATIC_THEMES[name]
            ? {
                  shadow: STATIC_THEMES[name]!.shadow,
                  sidebar: STATIC_THEMES[name]!.sidebar,
                  text: STATIC_THEMES[name]!.text
              }
            : undefined
    }))

    // Custom first, then built-in
    return [...customThemes, ...builtInThemes]
})
