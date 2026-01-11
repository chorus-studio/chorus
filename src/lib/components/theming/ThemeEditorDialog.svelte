<script lang="ts">
    import type { CSSVariable } from '$lib/utils/theming'
    import type {
        CustomTheme,
        CustomThemeType,
        ColorTheme,
        ImageTheme,
        GradientTheme,
        GradientStop,
        GradientConfig,
        ImageOptions,
        ImageSource
    } from '$lib/types/custom-theme'
    import { DEFAULT_IMAGE_OPTIONS, DEFAULT_GRADIENT_CONFIG } from '$lib/types/custom-theme'
    import { createDefaultGradientStops } from '$lib/utils/theme-css'
    import { STATIC_THEMES, type ThemeName } from '$lib/utils/theming'

    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tabs from '$lib/components/ui/tabs'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import { ScrollArea } from '$lib/components/ui/scroll-area'

    import ThemeNameInput from './ThemeNameInput.svelte'
    import ThemeLivePreview from './ThemeLivePreview.svelte'
    import ColorThemeEditor from './ColorThemeEditor.svelte'
    import ImageThemeEditor from './ImageThemeEditor.svelte'
    import GradientEditor from './GradientEditor.svelte'

    interface Props {
        open: boolean
        mode: 'create' | 'edit' | 'remix'
        initialTheme?: CustomTheme | ThemeName
        onSave: (theme: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>) => void
        onCancel: () => void
    }

    let { open = $bindable(false), mode, initialTheme, onSave, onCancel }: Props = $props()

    // Generate a random 5-character alphanumeric suffix for remix names
    function generateRemixSuffix(): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    // Whether theme type tabs should be locked (in edit/remix mode)
    const isTypeLocked = $derived(mode === 'edit' || mode === 'remix')

    // Default colors
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

    // Editor state - initialized with defaults
    let name = $state('')
    let themeType = $state<CustomThemeType>('color')
    let colors = $state<Record<CSSVariable, string>>({ ...defaultColors })
    let image = $state<ImageSource | undefined>(undefined)
    let imageOptions = $state<ImageOptions>({ ...DEFAULT_IMAGE_OPTIONS })
    let gradientStops = $state<GradientStop[]>(createDefaultGradientStops())
    let gradientConfig = $state<GradientConfig>({ ...DEFAULT_GRADIENT_CONFIG })
    let textColors = $state<{ text?: string; subtext?: string }>({})
    let remixedFrom = $state<string | undefined>(undefined)

    // Initialize state when dialog opens
    $effect(() => {
        if (open) {
            initializeState()
        }
    })

    function initializeState() {
        if (!initialTheme) {
            // Creating new theme from scratch
            name = ''
            themeType = 'color'
            colors = { ...defaultColors }
            image = undefined
            imageOptions = { ...DEFAULT_IMAGE_OPTIONS }
            gradientStops = createDefaultGradientStops()
            gradientConfig = { ...DEFAULT_GRADIENT_CONFIG }
            textColors = {}
            remixedFrom = undefined
            return
        }

        // Check if it's a built-in theme name (color theme only)
        if (typeof initialTheme === 'string') {
            const builtInColors = STATIC_THEMES[initialTheme]
            if (builtInColors) {
                const suffix = generateRemixSuffix()
                name = mode === 'remix' ? `${initialTheme.replace(/_/g, ' ')} - ${suffix}` : ''
                themeType = 'color'
                colors = { ...builtInColors }
                remixedFrom = `builtin:${initialTheme}`
            }
            return
        }

        // It's a custom theme (or built-in gradient passed as full object)
        const theme = initialTheme
        const suffix = generateRemixSuffix()
        name = mode === 'remix' ? `${theme.name} - ${suffix}` : theme.name
        themeType = theme.type
        remixedFrom = mode === 'remix' ? theme.id : theme.remixedFrom

        if (theme.type === 'color') {
            colors = { ...(theme as ColorTheme).colors }
        } else if (theme.type === 'image') {
            const imgTheme = theme as ImageTheme
            image = imgTheme.image ? { ...imgTheme.image } : undefined
            imageOptions = { ...DEFAULT_IMAGE_OPTIONS, ...imgTheme.options }
            textColors = imgTheme.textColors ? { ...imgTheme.textColors } : {}
        } else if (theme.type === 'gradient') {
            const gradTheme = theme as GradientTheme
            gradientStops = gradTheme.stops.map((s) => ({ ...s }))
            gradientConfig = { ...DEFAULT_GRADIENT_CONFIG, ...gradTheme.config }
            textColors = gradTheme.textColors ? { ...gradTheme.textColors } : {}
        }
    }

    // Validation
    const isNameValid = $derived(name.trim().length > 0)
    const canSave = $derived.by(() => {
        if (!isNameValid) return false
        if (themeType === 'gradient' && gradientStops.length < 2) return false
        return true
    })

    // Handle save
    function handleSave() {
        let themeData: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>

        if (themeType === 'color') {
            themeData = {
                name: name.trim(),
                type: 'color',
                colors,
                hidden: false,
                remixedFrom
            } as Omit<ColorTheme, 'id' | 'createdAt' | 'updatedAt'>
        } else if (themeType === 'image') {
            themeData = {
                name: name.trim(),
                type: 'image',
                image: image!,
                options: imageOptions,
                textColors: Object.keys(textColors).length > 0 ? textColors : undefined,
                hidden: false,
                remixedFrom
            } as Omit<ImageTheme, 'id' | 'createdAt' | 'updatedAt'>
        } else {
            themeData = {
                name: name.trim(),
                type: 'gradient',
                stops: gradientStops,
                config: gradientConfig,
                textColors: Object.keys(textColors).length > 0 ? textColors : undefined,
                hidden: false,
                remixedFrom
            } as Omit<GradientTheme, 'id' | 'createdAt' | 'updatedAt'>
        }

        onSave(themeData)
    }

    const dialogTitle = $derived(
        mode === 'create' ? 'Create Theme' : mode === 'edit' ? 'Edit Theme' : 'Remix Theme'
    )
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onCancel()}>
    <Dialog.Content class="max-h-[90vh] max-w-4xl overflow-hidden">
        <Dialog.Header>
            <Dialog.Title>{dialogTitle}</Dialog.Title>
        </Dialog.Header>

        <Separator />

        <div class="mt-4 flex gap-6">
            <!-- Left: Editor Controls -->
            <div class="flex flex-1 flex-col gap-4">
                <ThemeNameInput
                    bind:value={name}
                    excludeId={mode === 'edit' && typeof initialTheme === 'object'
                        ? initialTheme.id
                        : undefined}
                />

                <Tabs.Root bind:value={themeType}>
                    <Tabs.List class="grid w-full grid-cols-3">
                        <Tabs.Trigger
                            value="color"
                            disabled={isTypeLocked && themeType !== 'color'}
                        >
                            Colors
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="image"
                            disabled={isTypeLocked && themeType !== 'image'}
                        >
                            Image
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="gradient"
                            disabled={isTypeLocked && themeType !== 'gradient'}
                        >
                            Gradient
                        </Tabs.Trigger>
                    </Tabs.List>

                    <ScrollArea class="mt-4 h-[350px] pr-4">
                        <Tabs.Content value="color" class="mt-0">
                            <ColorThemeEditor bind:colors />
                        </Tabs.Content>

                        <Tabs.Content value="image" class="mt-0">
                            <ImageThemeEditor
                                bind:image
                                bind:options={imageOptions}
                                bind:textColors
                            />
                        </Tabs.Content>

                        <Tabs.Content value="gradient" class="mt-0">
                            <GradientEditor
                                bind:stops={gradientStops}
                                bind:config={gradientConfig}
                                bind:textColors
                            />
                        </Tabs.Content>
                    </ScrollArea>
                </Tabs.Root>
            </div>

            <!-- Right: Live Preview -->
            <div class="w-64 flex-shrink-0">
                <h4 class="mb-2 text-sm font-medium">Preview</h4>
                <ThemeLivePreview
                    type={themeType}
                    colors={themeType === 'color' ? colors : undefined}
                    {image}
                    imageOptions={themeType === 'image' ? imageOptions : undefined}
                    gradientStops={themeType === 'gradient' ? gradientStops : undefined}
                    gradientConfig={themeType === 'gradient' ? gradientConfig : undefined}
                    textColors={themeType !== 'color' ? textColors : undefined}
                />
            </div>
        </div>

        <Dialog.Footer class="mt-6">
            <Button variant="outline" onclick={onCancel}>Cancel</Button>
            <Button onclick={handleSave} disabled={!canSave}>
                {mode === 'edit' ? 'Save Changes' : 'Create Theme'}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
