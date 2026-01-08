<script lang="ts">
    import type { ThemeListItem } from '$lib/types/custom-theme'
    import ThemeCard from './ThemeCard.svelte'

    interface Props {
        themes: ThemeListItem[]
        selectedThemeId: string | null
        onSelect: (theme: ThemeListItem) => void
        onEdit?: (theme: ThemeListItem) => void
        onDelete?: (theme: ThemeListItem) => void
        onHide: (theme: ThemeListItem) => void
        onRemix: (theme: ThemeListItem) => void
        onExport?: (theme: ThemeListItem) => void
    }

    let { themes, selectedThemeId, onSelect, onEdit, onDelete, onHide, onRemix, onExport }: Props =
        $props()
</script>

{#if themes.length === 0}
    <div class="flex flex-col items-center justify-center py-12 text-center">
        <p class="text-sm text-muted-foreground">No themes found</p>
    </div>
{:else}
    <div class="grid grid-cols-5 gap-4">
        {#each themes as theme (theme.id)}
            <ThemeCard
                {theme}
                isSelected={selectedThemeId === theme.id}
                onSelect={() => onSelect(theme)}
                onEdit={!theme.isBuiltIn && onEdit ? () => onEdit(theme) : undefined}
                onDelete={!theme.isBuiltIn && onDelete ? () => onDelete(theme) : undefined}
                onHide={() => onHide(theme)}
                onRemix={() => onRemix(theme)}
                onExport={!theme.isBuiltIn && onExport ? () => onExport(theme) : undefined}
            />
        {/each}
    </div>
{/if}
