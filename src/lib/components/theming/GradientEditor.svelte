<script lang="ts">
    import type { GradientStop, GradientConfig, GradientType, RadialShape } from '$lib/types/custom-theme'
    import { GRADIENT_TYPES, DEFAULT_GRADIENT_CONFIG } from '$lib/types/custom-theme'
    import { generateGradientCSS, addGradientStop, createDefaultGradientStops } from '$lib/utils/theme-css'

    import { Label } from '$lib/components/ui/label'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import { Switch } from '$lib/components/ui/switch'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import * as ToggleGroup from '$lib/components/ui/toggle-group'
    import ColorPickerField from './ColorPickerField.svelte'
    import TextColorOverrides from './TextColorOverrides.svelte'
    import Plus from 'lucide-svelte/icons/plus'
    import X from 'lucide-svelte/icons/x'

    interface Props {
        stops: GradientStop[]
        config: GradientConfig
        textColors: { text?: string; subtext?: string }
    }

    let { stops = $bindable(createDefaultGradientStops()), config = $bindable({ ...DEFAULT_GRADIENT_CONFIG }), textColors = $bindable({}) }: Props = $props()

    // Update gradient type
    function updateType(type: GradientType) {
        config = { ...config, type }
    }

    // Update angle
    function updateAngle(value: number | number[]) {
        config = { ...config, angle: value as number }
    }

    // Update shape (for radial)
    function updateShape(shape: RadialShape) {
        config = { ...config, shape }
    }

    // Update position
    function updatePosition(x: number, y: number) {
        config = { ...config, position: { x, y } }
    }

    // Toggle repeating
    function toggleRepeating(checked: boolean) {
        config = { ...config, repeating: checked }
    }

    // Add a color stop
    function handleAddStop() {
        if (stops.length >= 5) return
        stops = addGradientStop(stops)
    }

    // Remove a color stop
    function removeStop(index: number) {
        if (stops.length <= 2) return
        stops = stops.filter((_, i) => i !== index)
    }

    // Update stop color
    function updateStopColor(index: number, color: string) {
        stops = stops.map((s, i) => (i === index ? { ...s, color } : s))
    }

    // Update stop position
    function updateStopPosition(index: number, position: number) {
        stops = stops.map((s, i) => (i === index ? { ...s, position } : s))
    }

    // Generate preview gradient
    const previewGradient = $derived(generateGradientCSS(config, stops))
</script>

<div class="flex flex-col gap-4">
    <!-- Gradient Type Selector -->
    <div class="flex flex-col gap-2">
        <Label>Gradient Type</Label>
        <ToggleGroup.Root
            type="single"
            value={config.type}
            onValueChange={(v) => v && updateType(v as GradientType)}
            class="justify-start"
        >
            {#each GRADIENT_TYPES as type}
                <ToggleGroup.Item value={type} class="capitalize">{type}</ToggleGroup.Item>
            {/each}
        </ToggleGroup.Root>
    </div>

    <!-- Type-specific controls -->
    {#if config.type === 'linear'}
        <div class="flex flex-col gap-2">
            <Label>Angle: {config.angle ?? 180}°</Label>
            <CustomSlider
                type="single"
                value={config.angle ?? 180}
                min={0}
                max={360}
                step={5}
                onValueChange={updateAngle}
            />
        </div>
    {:else if config.type === 'radial'}
        <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
                <Label>Shape</Label>
                <ToggleGroup.Root
                    type="single"
                    value={config.shape ?? 'ellipse'}
                    onValueChange={(v) => v && updateShape(v as RadialShape)}
                    class="justify-start"
                >
                    <ToggleGroup.Item value="circle">Circle</ToggleGroup.Item>
                    <ToggleGroup.Item value="ellipse">Ellipse</ToggleGroup.Item>
                </ToggleGroup.Root>
            </div>
            <div class="flex flex-col gap-2">
                <Label>Position X: {config.position?.x ?? 50}%</Label>
                <CustomSlider
                    type="single"
                    value={config.position?.x ?? 50}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v: number | number[]) => updatePosition(v as number, config.position?.y ?? 50)}
                />
            </div>
        </div>
        <div class="flex flex-col gap-2">
            <Label>Position Y: {config.position?.y ?? 50}%</Label>
            <CustomSlider
                type="single"
                value={config.position?.y ?? 50}
                min={0}
                max={100}
                step={5}
                onValueChange={(v: number | number[]) => updatePosition(config.position?.x ?? 50, v as number)}
            />
        </div>
    {:else if config.type === 'conic'}
        <div class="flex flex-col gap-2">
            <Label>Start Angle: {config.angle ?? 0}°</Label>
            <CustomSlider
                type="single"
                value={config.angle ?? 0}
                min={0}
                max={360}
                step={5}
                onValueChange={updateAngle}
            />
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
                <Label>Position X: {config.position?.x ?? 50}%</Label>
                <CustomSlider
                    type="single"
                    value={config.position?.x ?? 50}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v: number | number[]) => updatePosition(v as number, config.position?.y ?? 50)}
                />
            </div>
            <div class="flex flex-col gap-2">
                <Label>Position Y: {config.position?.y ?? 50}%</Label>
                <CustomSlider
                    type="single"
                    value={config.position?.y ?? 50}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v: number | number[]) => updatePosition(config.position?.x ?? 50, v as number)}
                />
            </div>
        </div>
    {/if}

    <!-- Repeating Toggle -->
    <div class="flex items-center justify-between">
        <Label>Repeating Gradient</Label>
        <Switch checked={config.repeating} onCheckedChange={toggleRepeating} />
    </div>

    <Separator />

    <!-- Color Stops -->
    <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
            <Label>Color Stops ({stops.length}/5)</Label>
            <Button
                variant="ghost"
                size="sm"
                onclick={handleAddStop}
                disabled={stops.length >= 5}
            >
                <Plus class="mr-1 size-4" />
                Add Stop
            </Button>
        </div>

        <div class="flex flex-col gap-2">
            {#each stops as stop, index (stop.id)}
                <div class="flex items-center gap-3 rounded-md bg-muted/50 p-2">
                    <!-- Color Picker -->
                    <input
                        type="color"
                        value={stop.color}
                        oninput={(e) => updateStopColor(index, (e.target as HTMLInputElement).value)}
                        class="size-8 cursor-pointer rounded border-0"
                    />

                    <!-- Position Slider -->
                    <div class="flex-1">
                        <CustomSlider
                            type="single"
                            value={stop.position}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(v: number | number[]) => updateStopPosition(index, v as number)}
                        />
                    </div>

                    <!-- Position Label -->
                    <span class="w-10 text-xs text-muted-foreground">{stop.position}%</span>

                    <!-- Delete Button -->
                    {#if stops.length > 2}
                        <Button
                            variant="ghost"
                            size="icon"
                            class="size-6"
                            onclick={() => removeStop(index)}
                        >
                            <X class="size-3" />
                        </Button>
                    {:else}
                        <div class="size-6"></div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>

    <!-- Gradient Preview -->
    <div class="flex flex-col gap-2">
        <Label>Preview</Label>
        <div
            class="h-12 w-full rounded-md border"
            style="background: {previewGradient}"
        ></div>
    </div>

    <Separator />

    <!-- Text Color Overrides -->
    <TextColorOverrides bind:textColors />
</div>
