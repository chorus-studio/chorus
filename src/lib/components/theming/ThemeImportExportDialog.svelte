<script lang="ts">
    import type { CustomTheme, ThemeListItem } from '$lib/types/custom-theme'
    import { customThemesStore } from '$lib/stores/custom-themes'
    import { exportTheme, importTheme, previewImport, copyToClipboard } from '$lib/utils/theme-import-export'

    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tabs from '$lib/components/ui/tabs'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import { Label } from '$lib/components/ui/label'
    import ThemeLivePreview from './ThemeLivePreview.svelte'
    import Copy from 'lucide-svelte/icons/copy'
    import Check from 'lucide-svelte/icons/check'
    import AlertCircle from 'lucide-svelte/icons/alert-circle'

    interface Props {
        open: boolean
        exportThemeId?: string
    }

    let { open = $bindable(false), exportThemeId }: Props = $props()

    let activeTab = $state<'export' | 'import'>('export')
    let selectedExportThemeId = $state<string | null>(exportThemeId ?? null)
    let exportCode = $state('')
    let copied = $state(false)

    let importCode = $state('')
    let importError = $state<string | null>(null)
    let importPreview = $state<Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'> | null>(null)
    let importNameConflict = $state(false)
    let importing = $state(false)

    // Get custom themes for export selection
    const customThemes = $derived(customThemesStore.getCustomThemes())

    // Generate export code when theme selection changes
    $effect(() => {
        if (selectedExportThemeId) {
            const theme = customThemesStore.getThemeById(selectedExportThemeId)
            if (theme) {
                exportCode = exportTheme(theme)
            }
        } else {
            exportCode = ''
        }
    })

    // Reset when dialog opens
    $effect(() => {
        if (open) {
            if (exportThemeId) {
                selectedExportThemeId = exportThemeId
                activeTab = 'export'
            }
            importCode = ''
            importError = null
            importPreview = null
            importNameConflict = false
        }
    })

    async function handleCopy() {
        const success = await copyToClipboard(exportCode)
        if (success) {
            copied = true
            setTimeout(() => {
                copied = false
            }, 2000)
        }
    }

    function handleImportCodeChange() {
        importError = null
        importPreview = null
        importNameConflict = false

        if (!importCode.trim()) return

        const result = previewImport(importCode.trim())
        if (result.success && result.theme) {
            importPreview = result.theme
            importNameConflict = result.nameConflict ?? false
        } else {
            importError = result.error ?? 'Invalid theme code'
        }
    }

    async function handleImport() {
        if (!importCode.trim()) return

        importing = true
        try {
            const result = await importTheme(importCode.trim())
            if (result.success) {
                open = false
                // Reset state
                importCode = ''
                importPreview = null
            } else {
                importError = result.error ?? 'Failed to import theme'
            }
        } finally {
            importing = false
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="max-w-lg">
        <Dialog.Header>
            <Dialog.Title>Import / Export Themes</Dialog.Title>
        </Dialog.Header>

        <Separator />

        <Tabs.Root bind:value={activeTab}>
            <Tabs.List class="grid w-full grid-cols-2">
                <Tabs.Trigger value="export">Export</Tabs.Trigger>
                <Tabs.Trigger value="import">Import</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="export" class="mt-4">
                <div class="flex flex-col gap-4">
                    {#if customThemes.length === 0}
                        <p class="py-4 text-center text-sm text-muted-foreground">
                            You don't have any custom themes to export yet.
                        </p>
                    {:else}
                        <div class="flex flex-col gap-2">
                            <Label>Select Theme</Label>
                            <CustomSelect
                                selected={selectedExportThemeId ?? ''}
                                options={customThemes.map((t) => ({ label: t.name, value: t.id }))}
                                onValueChange={(v: string) => (selectedExportThemeId = v)}
                            />
                        </div>

                        {#if exportCode}
                            <div class="flex flex-col gap-2">
                                <Label>Shareable Code</Label>
                                <div class="relative">
                                    <pre
                                        class="max-h-[150px] overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-4 font-mono text-xs"
                                    >{exportCode}</pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="absolute right-2 top-2"
                                        onclick={handleCopy}
                                    >
                                        {#if copied}
                                            <Check class="size-4 text-green-500" />
                                        {:else}
                                            <Copy class="size-4" />
                                        {/if}
                                    </Button>
                                </div>
                                <p class="text-xs text-muted-foreground">
                                    Share this code with others to let them import your theme.
                                </p>
                            </div>
                        {/if}
                    {/if}
                </div>
            </Tabs.Content>

            <Tabs.Content value="import" class="mt-4">
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2">
                        <Label>Paste Theme Code</Label>
                        <textarea
                            bind:value={importCode}
                            oninput={handleImportCodeChange}
                            placeholder="Paste theme code here..."
                            class="h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        ></textarea>
                    </div>

                    {#if importError}
                        <div class="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            <AlertCircle class="size-4" />
                            {importError}
                        </div>
                    {/if}

                    {#if importPreview}
                        <div class="flex flex-col gap-3">
                            <div class="rounded-md bg-muted p-3">
                                <h4 class="font-medium">{importPreview.name}</h4>
                                <p class="text-xs text-muted-foreground capitalize">
                                    {importPreview.type} theme
                                </p>
                                {#if importNameConflict}
                                    <p class="mt-1 text-xs text-amber-500">
                                        A theme with this name exists. It will be renamed on import.
                                    </p>
                                {/if}
                            </div>

                            <ThemeLivePreview
                                type={importPreview.type}
                                colors={importPreview.type === 'color' ? (importPreview as any).colors : undefined}
                                image={importPreview.type === 'image' ? (importPreview as any).image : undefined}
                                imageOptions={importPreview.type === 'image' ? (importPreview as any).options : undefined}
                                gradientStops={importPreview.type === 'gradient' ? (importPreview as any).stops : undefined}
                                gradientConfig={importPreview.type === 'gradient' ? (importPreview as any).config : undefined}
                                textColors={importPreview.type !== 'color' ? (importPreview as any).textColors : undefined}
                                compact
                            />

                            <Button onclick={handleImport} disabled={importing}>
                                {importing ? 'Importing...' : 'Import Theme'}
                            </Button>
                        </div>
                    {/if}
                </div>
            </Tabs.Content>
        </Tabs.Root>

        <Dialog.Footer>
            <Button variant="outline" onclick={() => (open = false)}>Close</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
