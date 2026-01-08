<script lang="ts">
    import type { CSSVariable } from '$lib/utils/theming'
    import type { GradientConfig, GradientStop, ImageOptions, ImageSource } from '$lib/types/custom-theme'
    import { generateGradientCSS, generateFilterCSS } from '$lib/utils/theme-css'

    interface Props {
        type: 'color' | 'image' | 'gradient'
        colors?: Partial<Record<CSSVariable, string>>
        image?: ImageSource
        imageOptions?: ImageOptions
        gradientStops?: GradientStop[]
        gradientConfig?: GradientConfig
        textColors?: { text?: string; subtext?: string }
        compact?: boolean
    }

    let {
        type,
        colors,
        image,
        imageOptions,
        gradientStops,
        gradientConfig,
        textColors,
        compact = false
    }: Props = $props()

    // Default colors for preview
    const defaultColors: Record<CSSVariable, string> = {
        text: '#ffffff',
        subtext: '#b3b3b3',
        main: '#121212',
        sidebar: '#121212',
        player: '#181818',
        card: '#282828',
        shadow: '#000000',
        selected_row: '#1ed760',
        button: '#1ed760',
        button_active: '#1ed760',
        button_disabled: '#535353',
        tab_active: '#333333',
        notification: '#4687d6',
        notification_error: '#e22134',
        misc: '#7f7f7f'
    }

    const previewColors = $derived({ ...defaultColors, ...colors })
    const textColor = $derived(textColors?.text ?? previewColors.text)
    const subtextColor = $derived(textColors?.subtext ?? previewColors.subtext)

    // Generate background style
    const backgroundStyle = $derived.by(() => {
        if (type === 'gradient' && gradientStops && gradientConfig) {
            const gradient = generateGradientCSS(gradientConfig, gradientStops)
            return `background: ${gradient}`
        }
        if (type === 'image' && image && imageOptions) {
            const imgUrl =
                image.source === 'base64'
                    ? `url(data:image/png;base64,${image.data})`
                    : `url(${image.data})`
            const filter = generateFilterCSS(imageOptions.filters)
            const position =
                typeof imageOptions.position === 'string'
                    ? imageOptions.position
                    : `${imageOptions.position.x}% ${imageOptions.position.y}%`
            return `
                background-image: ${imgUrl};
                background-size: ${imageOptions.objectFit};
                background-position: ${position};
                background-repeat: no-repeat;
                opacity: ${imageOptions.opacity / 100};
                ${filter !== 'none' ? `filter: ${filter}` : ''}
            `
        }
        return `background-color: ${previewColors.main}`
    })
</script>

<div
    class="relative overflow-hidden rounded-md border {compact ? 'h-24 w-full' : 'h-48 w-full'}"
    style={backgroundStyle}
>
    <!-- Mini UI mockup -->
    <div class="absolute inset-0 flex p-2">
        <!-- Sidebar -->
        <div
            class="flex w-1/4 flex-col gap-1 rounded-sm p-1"
            style="background-color: {previewColors.sidebar}"
        >
            <div class="h-2 w-3/4 rounded-sm" style="background-color: {previewColors.card}"></div>
            <div class="h-2 w-1/2 rounded-sm" style="background-color: {previewColors.card}"></div>
            <div class="h-2 w-2/3 rounded-sm" style="background-color: {previewColors.button}"></div>
        </div>

        <!-- Main content -->
        <div class="flex flex-1 flex-col gap-1 p-1">
            <!-- Header -->
            <div class="flex items-center gap-1">
                <span class="text-[8px] font-medium" style="color: {textColor}">Title</span>
                <span class="text-[6px]" style="color: {subtextColor}">Subtitle</span>
            </div>

            <!-- Content cards -->
            <div class="grid grid-cols-3 gap-1">
                {#each [1, 2, 3] as _}
                    <div
                        class="aspect-square rounded-sm"
                        style="background-color: {previewColors.card}"
                    ></div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Player bar -->
    <div
        class="absolute bottom-0 left-0 right-0 flex h-6 items-center gap-2 px-2"
        style="background-color: {previewColors.player}"
    >
        <div class="size-4 rounded-full" style="background-color: {previewColors.button}"></div>
        <div class="h-1 flex-1 rounded-full" style="background-color: {previewColors.button_disabled}">
            <div class="h-full w-1/3 rounded-full" style="background-color: {previewColors.button}"></div>
        </div>
    </div>
</div>
