<script lang="ts">
    import type { ThemeListItem } from '$lib/types/custom-theme'
    import { hiddenThemes, customThemesStore } from '$lib/stores/custom-themes'

    import * as Dialog from '$lib/components/ui/dialog'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import { ScrollArea } from '$lib/components/ui/scroll-area'
    import { Badge } from '$lib/components/ui/badge'
    import EyeOff from 'lucide-svelte/icons/eye-off'
    import Eye from 'lucide-svelte/icons/eye'

    interface Props {
        open: boolean
    }

    let { open = $bindable(false) }: Props = $props()

    // Track selected themes for bulk unhide
    let selectedThemes = $state<Set<string>>(new Set())

    function toggleSelection(id: string) {
        const newSet = new Set(selectedThemes)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        selectedThemes = newSet
    }

    async function unhideTheme(theme: ThemeListItem) {
        await customThemesStore.unhideTheme(theme.id, theme.isBuiltIn)
        selectedThemes.delete(theme.id)
        selectedThemes = new Set(selectedThemes)
    }

    async function bulkUnhide() {
        for (const id of selectedThemes) {
            const theme = $hiddenThemes.find((t) => t.id === id)
            if (theme) {
                await customThemesStore.unhideTheme(theme.id, theme.isBuiltIn)
            }
        }
        selectedThemes = new Set()
    }

    function selectAll() {
        selectedThemes = new Set($hiddenThemes.map((t) => t.id))
    }

    function clearSelection() {
        selectedThemes = new Set()
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>Hidden Themes</Dialog.Title>
        </Dialog.Header>

        <Separator />

        {#if $hiddenThemes.length === 0}
            <div class="flex flex-col items-center justify-center py-12 text-center">
                <EyeOff class="mb-2 size-12 opacity-20" />
                <p class="text-sm text-muted-foreground">No hidden themes</p>
                <p class="text-xs text-muted-foreground">
                    Hidden themes will appear here.
                </p>
            </div>
        {:else}
            <div class="flex items-center justify-between py-2">
                <span class="text-sm text-muted-foreground">
                    {selectedThemes.size} of {$hiddenThemes.length} selected
                </span>
                <div class="flex gap-2">
                    {#if selectedThemes.size > 0}
                        <Button variant="ghost" size="sm" onclick={clearSelection}>
                            Clear
                        </Button>
                    {:else}
                        <Button variant="ghost" size="sm" onclick={selectAll}>
                            Select All
                        </Button>
                    {/if}
                    <Button
                        size="sm"
                        onclick={bulkUnhide}
                        disabled={selectedThemes.size === 0}
                    >
                        Unhide Selected
                    </Button>
                </div>
            </div>

            <ScrollArea class="h-[300px]">
                <div class="flex flex-col gap-2 pr-4">
                    {#each $hiddenThemes as theme (theme.id)}
                        <div
                            class="flex items-center justify-between rounded-md border p-3 {selectedThemes.has(
                                theme.id
                            )
                                ? 'border-primary bg-primary/5'
                                : ''}"
                        >
                            <button
                                type="button"
                                class="flex flex-1 items-center gap-3 text-left"
                                onclick={() => toggleSelection(theme.id)}
                            >
                                <!-- Preview color -->
                                <div
                                    class="size-8 rounded-md"
                                    style="background-color: {theme.previewColors?.shadow ?? '#1a1a1a'}"
                                ></div>

                                <div class="flex flex-col">
                                    <span class="text-sm font-medium">{theme.name}</span>
                                    <div class="flex gap-1">
                                        {#if theme.isBuiltIn}
                                            <Badge variant="secondary" class="text-[10px]">Built-in</Badge>
                                        {:else}
                                            <Badge variant="outline" class="text-[10px]">Custom</Badge>
                                        {/if}
                                        {#if theme.type}
                                            <Badge variant="outline" class="text-[10px] capitalize">
                                                {theme.type}
                                            </Badge>
                                        {/if}
                                    </div>
                                </div>
                            </button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => unhideTheme(theme)}
                            >
                                <Eye class="mr-1 size-4" />
                                Unhide
                            </Button>
                        </div>
                    {/each}
                </div>
            </ScrollArea>
        {/if}

        <Dialog.Footer>
            <Button variant="outline" onclick={() => (open = false)}>Close</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
