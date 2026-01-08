<script lang="ts">
    import type { ImageSource, ImageOptions } from '$lib/types/custom-theme'
    import {
        DEFAULT_IMAGE_OPTIONS,
        MIX_BLEND_MODES,
        OBJECT_FIT_OPTIONS,
        POSITION_PRESETS
    } from '$lib/types/custom-theme'

    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import TextColorOverrides from './TextColorOverrides.svelte'
    import Upload from 'lucide-svelte/icons/upload'
    import Link from 'lucide-svelte/icons/link'
    import Trash2 from 'lucide-svelte/icons/trash-2'

    interface Props {
        image?: ImageSource
        options: ImageOptions
        textColors: { text?: string; subtext?: string }
    }

    let { image = $bindable(), options = $bindable({ ...DEFAULT_IMAGE_OPTIONS }), textColors = $bindable({}) }: Props = $props()

    let urlInput = $state('')
    let sourceType = $state<'url' | 'file'>('url')
    let fileInputRef: HTMLInputElement | undefined = $state()

    // Initialize urlInput from image if it's a URL
    $effect(() => {
        if (image?.source === 'url') {
            urlInput = image.data
        }
    })

    function handleUrlSubmit() {
        if (!urlInput.trim()) return

        image = {
            source: 'url',
            data: urlInput.trim()
        }
    }

    function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement
        const file = target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file')
            return
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB')
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const result = event.target?.result as string
            // Extract base64 data (remove data:image/...;base64, prefix)
            const base64 = result.split(',')[1]

            image = {
                source: 'base64',
                data: base64
            }
        }
        reader.readAsDataURL(file)
    }

    function clearImage() {
        image = undefined
        urlInput = ''
    }

    function updateOption<K extends keyof ImageOptions>(key: K, value: ImageOptions[K]) {
        options = { ...options, [key]: value }
    }

    function updateFilter(key: keyof ImageOptions['filters'], value: number) {
        options = {
            ...options,
            filters: { ...options.filters, [key]: value }
        }
    }

    // Preview URL
    const previewUrl = $derived.by(() => {
        if (!image) return null
        if (image.source === 'url') return image.data
        return `data:image/png;base64,${image.data}`
    })
</script>

<div class="flex flex-col gap-4">
    <!-- Image Source -->
    <div class="flex flex-col gap-3">
        <Label class="text-sm font-medium">Image Source</Label>

        <!-- URL Input -->
        <div class="flex gap-2">
            <div class="relative flex-1">
                <Link class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="url"
                    bind:value={urlInput}
                    placeholder="https://example.com/image.jpg"
                    class="pl-8"
                />
            </div>
            <Button variant="outline" onclick={handleUrlSubmit}>Load</Button>
        </div>

        <!-- File Upload -->
        <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">or</span>
            <Button variant="outline" onclick={() => fileInputRef?.click()}>
                <Upload class="mr-2 size-4" />
                Upload Image
            </Button>
            <input
                type="file"
                accept="image/*"
                bind:this={fileInputRef}
                onchange={handleFileSelect}
                class="hidden"
            />
        </div>
    </div>

    {#if image}
        <!-- Image Preview -->
        <div class="relative h-32 overflow-hidden rounded-md border">
            <img src={previewUrl} alt="Background preview" class="h-full w-full object-cover" />
            <Button
                variant="destructive"
                size="icon"
                class="absolute right-2 top-2 size-8"
                onclick={clearImage}
            >
                <Trash2 class="size-4" />
            </Button>
        </div>

        <Separator />

        <!-- CSS Options -->
        <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
                <Label>Object Fit</Label>
                <CustomSelect
                    selected={options.objectFit}
                    options={OBJECT_FIT_OPTIONS.map((o) => ({ label: o, value: o }))}
                    onValueChange={(v: string) => updateOption('objectFit', v as ImageOptions['objectFit'])}
                />
            </div>

            <div class="flex flex-col gap-2">
                <Label>Blend Mode</Label>
                <CustomSelect
                    selected={options.mixBlendMode}
                    options={MIX_BLEND_MODES.map((m) => ({ label: m, value: m }))}
                    onValueChange={(v: string) => updateOption('mixBlendMode', v as ImageOptions['mixBlendMode'])}
                />
            </div>
        </div>

        <!-- Opacity -->
        <div class="flex flex-col gap-2">
            <Label>Opacity: {options.opacity}%</Label>
            <CustomSlider
                type="single"
                value={options.opacity}
                min={0}
                max={100}
                step={1}
                onValueChange={(v: number | number[]) => updateOption('opacity', v as number)}
            />
        </div>

        <!-- Position -->
        <div class="flex flex-col gap-2">
            <Label>Position</Label>
            <CustomSelect
                selected={typeof options.position === 'string' ? options.position : 'custom'}
                options={[...POSITION_PRESETS]}
                onValueChange={(v: string) => updateOption('position', v)}
            />
        </div>

        <Separator />

        <!-- Filters -->
        <div class="flex flex-col gap-3">
            <Label class="text-sm font-medium">Image Filters</Label>

            <div class="flex flex-col gap-2">
                <Label class="text-xs">Blur: {options.filters.blur ?? 0}px</Label>
                <CustomSlider
                    type="single"
                    value={options.filters.blur ?? 0}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={(v: number | number[]) => updateFilter('blur', v as number)}
                />
            </div>

            <div class="flex flex-col gap-2">
                <Label class="text-xs">Brightness: {options.filters.brightness ?? 100}%</Label>
                <CustomSlider
                    type="single"
                    value={options.filters.brightness ?? 100}
                    min={0}
                    max={200}
                    step={5}
                    onValueChange={(v: number | number[]) => updateFilter('brightness', v as number)}
                />
            </div>

            <div class="flex flex-col gap-2">
                <Label class="text-xs">Contrast: {options.filters.contrast ?? 100}%</Label>
                <CustomSlider
                    type="single"
                    value={options.filters.contrast ?? 100}
                    min={0}
                    max={200}
                    step={5}
                    onValueChange={(v: number | number[]) => updateFilter('contrast', v as number)}
                />
            </div>

            <div class="flex flex-col gap-2">
                <Label class="text-xs">Saturate: {options.filters.saturate ?? 100}%</Label>
                <CustomSlider
                    type="single"
                    value={options.filters.saturate ?? 100}
                    min={0}
                    max={200}
                    step={5}
                    onValueChange={(v: number | number[]) => updateFilter('saturate', v as number)}
                />
            </div>

            <div class="flex flex-col gap-2">
                <Label class="text-xs">Grayscale: {options.filters.grayscale ?? 0}%</Label>
                <CustomSlider
                    type="single"
                    value={options.filters.grayscale ?? 0}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v: number | number[]) => updateFilter('grayscale', v as number)}
                />
            </div>
        </div>

        <Separator />

        <!-- Text Color Overrides -->
        <TextColorOverrides bind:textColors />
    {:else}
        <p class="py-4 text-center text-sm text-muted-foreground">
            Enter a URL or upload an image to get started.
        </p>
    {/if}
</div>
