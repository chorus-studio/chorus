<script lang="ts">
    import type { ThemeListItem } from '$lib/types/custom-theme'
    import { generateGradientCSS } from '$lib/utils/theme-css'
    import { Button } from '$lib/components/ui/button'
    import { Badge } from '$lib/components/ui/badge'
    import ThemeActions from './ThemeActions.svelte'
    import Image from 'lucide-svelte/icons/image'
    import Palette from 'lucide-svelte/icons/palette'

    interface Props {
        theme: ThemeListItem
        isSelected: boolean
        onSelect: () => void
        onEdit?: () => void
        onDelete?: () => void
        onHide: () => void
        onRemix: () => void
        onExport?: () => void
    }

    let { theme, isSelected, onSelect, onEdit, onDelete, onHide, onRemix, onExport }: Props =
        $props()

    const bgColor = $derived(theme.previewColors?.shadow ?? '#1a1a1a')
    const sidebarColor = $derived(theme.previewColors?.sidebar ?? '#121212')
    const textColor = $derived(theme.previewColors?.text ?? '#ffffff')

    // Generate gradient CSS for preview
    const gradientCSS = $derived(
        theme.gradientPreview
            ? generateGradientCSS(theme.gradientPreview.config, theme.gradientPreview.stops)
            : null
    )

    // Get image URL for preview
    const imageUrl = $derived(
        theme.imageThumbnail
            ? theme.imageThumbnail.startsWith('data:')
                ? theme.imageThumbnail
                : theme.imageThumbnail.startsWith('http')
                  ? theme.imageThumbnail
                  : `data:image/png;base64,${theme.imageThumbnail}`
            : null
    )

    // Get icon based on theme type
    const themeTypeIcon = $derived(() => {
        if (!theme.type || theme.type === 'color') return null
        if (theme.type === 'image') return Image
        if (theme.type === 'gradient') return Palette
        return null
    })
</script>

<div
    class="group relative aspect-square size-32 overflow-hidden rounded-md transition-transform hover:scale-105"
    style="background-color: {bgColor}"
>
    <!-- Selection Button -->
    <Button
        variant="outline"
        onclick={onSelect}
        class="absolute z-10 aspect-square size-32 rounded-md bg-transparent hover:bg-transparent {isSelected
            ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background'
            : ''}"
    ></Button>

    <!-- Custom Theme Badge -->
    {#if !theme.isBuiltIn}
        <Badge variant="secondary" class="absolute left-1 top-1 z-20 px-1.5 py-0.5 text-[10px]">
            Custom
        </Badge>
    {/if}

    <!-- Theme Type Icon -->
    {#if themeTypeIcon()}
        <div class="absolute right-1 top-1 z-20">
            <svelte:component
                this={themeTypeIcon()}
                class="size-3 opacity-60"
                style="color: {textColor}"
            />
        </div>
    {/if}

    <!-- Theme Name -->
    <span
        class="absolute bottom-1.5 left-0 right-0 z-[5] truncate px-1 text-center text-xs drop-shadow-md"
        style="color: {gradientCSS || imageUrl ? '#ffffff' : textColor}"
    >
        {theme.name}
    </span>

    <!-- Gradient Preview Background -->
    {#if gradientCSS}
        <div class="absolute inset-0 rounded-md" style="background: {gradientCSS}"></div>
        <!-- Image Preview Background -->
    {:else if imageUrl}
        <div
            class="absolute inset-0 rounded-md bg-cover bg-center"
            style="background-image: url({imageUrl})"
        ></div>
        <!-- Color Theme Preview Layout -->
    {:else}
        <div
            class="absolute inset-0 flex justify-center gap-1 rounded-md p-1 py-2"
            style="background-color: {bgColor}"
        >
            <div
                style="background-color: {sidebarColor}"
                class="left-0 h-24 w-2.5 rounded-sm"
            ></div>
            <div
                style="background-color: {sidebarColor}"
                class="left-1 top-2 h-24 w-24 rounded-sm"
            ></div>
        </div>
    {/if}

    <!-- Actions Dropdown (visible on hover) -->
    <div class="absolute right-1 top-7 z-20 opacity-0 transition-opacity group-hover:opacity-100">
        <ThemeActions
            isBuiltIn={theme.isBuiltIn}
            {onEdit}
            {onDelete}
            {onHide}
            {onRemix}
            {onExport}
        />
    </div>
</div>
