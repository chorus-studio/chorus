<script lang="ts">
    import type { ThemeName } from '$lib/utils/theming'
    import { settingsStore } from '$lib/stores/settings'
    import { setTheme, setThemeUnified } from '$lib/utils/theming'
    import { customThemesStore, visibleThemes } from '$lib/stores/custom-themes'
    import type { CustomTheme, CustomThemeType, ThemeListItem } from '$lib/types/custom-theme'
    import { isBuiltinGradientId, getBuiltinGradientTheme } from '$lib/types/custom-theme'

    import { Button } from '$lib/components/ui/button'
    import { ScrollArea } from '$lib/components/ui/scroll-area'
    import * as AlertDialog from '$lib/components/ui/alert-dialog'
    import {
        ThemeGrid,
        ThemeSearchBar,
        ThemeEditorDialog,
        HiddenThemesDialog,
        ThemeImportExportDialog
    } from '$lib/components/theming'
    import Plus from 'lucide-svelte/icons/plus'
    import EyeOff from 'lucide-svelte/icons/eye-off'
    import Download from 'lucide-svelte/icons/download'

    // Search and filter state
    let searchQuery = $state('')
    let activeFilter = $state<'all' | CustomThemeType>('all')

    // Dialog states
    let showEditor = $state(false)
    let editorMode = $state<'create' | 'edit' | 'remix'>('create')
    let editingTheme = $state<CustomTheme | ThemeName | undefined>(undefined)
    let showHiddenThemes = $state(false)
    let showImportExport = $state(false)
    let exportThemeId = $state<string | undefined>(undefined)
    let showDeleteConfirm = $state(false)
    let themeToDelete = $state<ThemeListItem | null>(null)

    // Current selected theme - use settings store as source of truth
    const currentThemeId = $derived($settingsStore.theme.customThemeId ?? $settingsStore.theme.name)

    // Filter themes by search query and type
    const filteredThemes = $derived.by(() => {
        let themes = $visibleThemes

        // Filter by type
        if (activeFilter !== 'all') {
            themes = themes.filter((t) => {
                // Built-in color themes have no type field or type === undefined
                if (activeFilter === 'color') {
                    return !t.type || t.type === 'color'
                }
                return t.type === activeFilter
            })
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            themes = themes.filter((t) => t.name.toLowerCase().includes(query))
        }

        return themes
    })

    // Count themes by type for filter badges
    const themeCounts = $derived({
        all: $visibleThemes.length,
        color: $visibleThemes.filter((t) => !t.type || t.type === 'color').length,
        gradient: $visibleThemes.filter((t) => t.type === 'gradient').length,
        image: $visibleThemes.filter((t) => t.type === 'image').length
    })

    // Handle theme selection
    async function handleSelectTheme(theme: ThemeListItem) {
        if (theme.id === currentThemeId) return

        // Built-in gradient themes need special handling - they're "built-in" but applied like custom themes
        if (isBuiltinGradientId(theme.id)) {
            // Store the built-in gradient ID as customThemeId
            await settingsStore.updateSettings({
                theme: {
                    ...$settingsStore.theme,
                    customThemeId: theme.id
                }
            })
            await customThemesStore.setActiveTheme(theme.id)
            await setThemeUnified(theme.id, customThemesStore.getThemeById)
        } else if (theme.isBuiltIn) {
            // Update settings store for built-in color theme, clear customThemeId
            await settingsStore.updateSettings({
                theme: {
                    ...$settingsStore.theme,
                    name: theme.id as ThemeName,
                    customThemeId: null
                }
            })
            await customThemesStore.setActiveTheme(null)
            await setTheme(theme.id as ThemeName)
        } else {
            // Apply custom theme and persist customThemeId in settings
            await settingsStore.updateSettings({
                theme: {
                    ...$settingsStore.theme,
                    customThemeId: theme.id
                }
            })
            await customThemesStore.setActiveTheme(theme.id)
            await setThemeUnified(theme.id, customThemesStore.getThemeById)
        }
    }

    // Handle edit theme
    function handleEditTheme(theme: ThemeListItem) {
        if (theme.isBuiltIn) return
        const customTheme = customThemesStore.getThemeById(theme.id)
        if (customTheme) {
            editingTheme = customTheme
            editorMode = 'edit'
            showEditor = true
        }
    }

    // Handle delete theme - show confirmation dialog
    function handleDeleteTheme(theme: ThemeListItem) {
        if (theme.isBuiltIn) return
        themeToDelete = theme
        showDeleteConfirm = true
    }

    // Confirm delete theme
    async function confirmDeleteTheme() {
        if (!themeToDelete) return
        const themeId = themeToDelete.id
        await customThemesStore.deleteTheme(themeId)
        // If deleted theme was active, switch to Spotify default
        if (currentThemeId === themeId) {
            await settingsStore.updateSettings({
                theme: { ...$settingsStore.theme, name: 'spotify', customThemeId: null }
            })
            await customThemesStore.setActiveTheme(null)
            await setTheme('spotify')
        }
        themeToDelete = null
        showDeleteConfirm = false
    }

    // Cancel delete
    function cancelDeleteTheme() {
        themeToDelete = null
        showDeleteConfirm = false
    }

    // Handle hide theme
    async function handleHideTheme(theme: ThemeListItem) {
        await customThemesStore.hideTheme(theme.id, theme.isBuiltIn)
        // If hidden theme was active, switch to Spotify default
        if (currentThemeId === theme.id) {
            await settingsStore.updateSettings({
                theme: { ...$settingsStore.theme, name: 'spotify', customThemeId: null }
            })
            await customThemesStore.setActiveTheme(null)
            await setTheme('spotify')
        }
    }

    // Handle remix theme
    function handleRemixTheme(theme: ThemeListItem) {
        if (theme.isBuiltIn) {
            // Check if it's a built-in gradient theme
            if (isBuiltinGradientId(theme.id)) {
                const gradientTheme = getBuiltinGradientTheme(theme.id)
                if (gradientTheme) {
                    editingTheme = gradientTheme
                }
            } else {
                // Built-in color theme
                editingTheme = theme.id as ThemeName
            }
        } else {
            const customTheme = customThemesStore.getThemeById(theme.id)
            if (customTheme) {
                editingTheme = customTheme
            }
        }
        editorMode = 'remix'
        showEditor = true
    }

    // Handle export theme
    function handleExportTheme(theme: ThemeListItem) {
        if (theme.isBuiltIn) return
        exportThemeId = theme.id
        showImportExport = true
    }

    // Handle create new theme
    function handleCreateTheme() {
        editingTheme = undefined
        editorMode = 'create'
        showEditor = true
    }

    // Handle save theme
    async function handleSaveTheme(themeData: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>) {
        if (editorMode === 'edit' && editingTheme && typeof editingTheme !== 'string') {
            await customThemesStore.updateTheme(editingTheme.id, themeData as Partial<CustomTheme>)
            // If editing active theme, reapply it
            if (currentThemeId === editingTheme.id) {
                await setThemeUnified(editingTheme.id, customThemesStore.getThemeById)
            }
        } else {
            const result = await customThemesStore.createTheme(themeData as any)
            if (result.success && result.theme) {
                // Optionally select the new theme
                await handleSelectTheme({
                    id: result.theme.id,
                    name: result.theme.name,
                    isBuiltIn: false,
                    hidden: false,
                    type: result.theme.type
                })
            }
        }
        showEditor = false
    }

    function handleCancelEditor() {
        showEditor = false
        editingTheme = undefined
    }

    function handleShowImportExport() {
        exportThemeId = undefined
        showImportExport = true
    }
</script>

<div class="flex flex-col gap-4">
    <!-- Header Row -->
    <div class="flex w-full flex-col gap-2 rounded-md">
        <div class="flex w-full items-center justify-between rounded-md bg-muted p-4">
            <div>
                <h1 class="text-lg font-semibold">Theming</h1>
                <p class="text-sm text-muted-foreground">
                    Customize the appearance of Chorus to your liking.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" onclick={handleShowImportExport}>
                    <Download class="mr-1 size-4" />
                    Import
                </Button>
                <Button variant="outline" size="sm" onclick={() => (showHiddenThemes = true)}>
                    <EyeOff class="mr-1 size-4" />
                    Hidden
                </Button>
                <Button size="sm" onclick={handleCreateTheme}>
                    <Plus class="mr-1 size-4" />
                    Create
                </Button>
            </div>
        </div>
    </div>

    <!-- Search Bar and Filters -->
    <div class="flex flex-col gap-2">
        <ThemeSearchBar bind:value={searchQuery} />

        <!-- Type Filters -->
        <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">Filter:</span>
            <div class="flex gap-1">
                <Button
                    variant={activeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    class="h-7 px-2 text-xs"
                    onclick={() => (activeFilter = 'all')}
                >
                    All ({themeCounts.all})
                </Button>
                <Button
                    variant={activeFilter === 'color' ? 'default' : 'outline'}
                    size="sm"
                    class="h-7 px-2 text-xs"
                    onclick={() => (activeFilter = 'color')}
                >
                    Static ({themeCounts.color})
                </Button>
                <Button
                    variant={activeFilter === 'gradient' ? 'default' : 'outline'}
                    size="sm"
                    class="h-7 px-2 text-xs"
                    onclick={() => (activeFilter = 'gradient')}
                >
                    Gradients ({themeCounts.gradient})
                </Button>
                <Button
                    variant={activeFilter === 'image' ? 'default' : 'outline'}
                    size="sm"
                    class="h-7 px-2 text-xs"
                    onclick={() => (activeFilter = 'image')}
                >
                    Backgrounds ({themeCounts.image})
                </Button>
            </div>
        </div>
    </div>

    <!-- Theme Grid -->
    <ScrollArea class="h-[400px]">
        <ThemeGrid
            themes={filteredThemes}
            selectedThemeId={currentThemeId}
            onSelect={handleSelectTheme}
            onEdit={handleEditTheme}
            onDelete={handleDeleteTheme}
            onHide={handleHideTheme}
            onRemix={handleRemixTheme}
            onExport={handleExportTheme}
        />
    </ScrollArea>
</div>

<!-- Theme Editor Dialog -->
<ThemeEditorDialog
    bind:open={showEditor}
    mode={editorMode}
    initialTheme={editingTheme}
    onSave={handleSaveTheme}
    onCancel={handleCancelEditor}
/>

<!-- Hidden Themes Dialog -->
<HiddenThemesDialog bind:open={showHiddenThemes} />

<!-- Import/Export Dialog -->
<ThemeImportExportDialog bind:open={showImportExport} {exportThemeId} />

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteConfirm}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Delete Theme</AlertDialog.Title>
            <AlertDialog.Description>
                Are you sure you want to delete "{themeToDelete?.name}"? This action cannot be
                undone.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel onclick={cancelDeleteTheme}>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
                onclick={confirmDeleteTheme}
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                Delete
            </AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
