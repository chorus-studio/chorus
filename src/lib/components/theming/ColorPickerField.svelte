<script lang="ts">
    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import Pipette from 'lucide-svelte/icons/pipette'

    interface Props {
        label: string
        description?: string
        value: string
        onchange?: (value: string) => void
    }

    let { label, description, value = $bindable('#000000'), onchange }: Props = $props()

    // Calculate if color is light or dark for icon contrast
    const isLightColor = $derived.by(() => {
        const hex = value.replace('#', '')
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        // Using relative luminance formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance > 0.5
    })

    function handleColorChange(e: Event) {
        const target = e.target as HTMLInputElement
        value = target.value
        onchange?.(value)
    }

    function handleInputChange(e: Event) {
        const target = e.target as HTMLInputElement
        const inputValue = target.value
        // Validate hex color
        if (/^#[0-9a-fA-F]{6}$/.test(inputValue)) {
            value = inputValue
            onchange?.(value)
        }
    }
</script>

<div class="flex items-center gap-3 rounded-md bg-muted/50 p-2">
    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <label
                    aria-label="Pick color for {label}"
                    class="group relative flex size-8 cursor-pointer items-center justify-center rounded-md border border-muted-foreground transition-all hover:scale-105 hover:border-foreground"
                    style="background-color: {value}"
                >
                    <!-- Pipette icon overlay on hover -->
                    <Pipette
                        class="size-4 opacity-0 drop-shadow-md transition-opacity group-hover:opacity-100"
                        style="color: {isLightColor ? '#000000' : '#ffffff'}"
                    />
                    <!-- Native color picker input -->
                    <input
                        type="color"
                        {value}
                        oninput={handleColorChange}
                        class="absolute inset-0 cursor-pointer opacity-0"
                    />
                </label>
            </Tooltip.Trigger>
            <Tooltip.Content side="left">
                <p>Click to pick color</p>
            </Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <div class="min-w-0 flex-1">
        <Label class="truncate text-sm font-medium">{label}</Label>
        <Input
            type="text"
            {value}
            oninput={handleInputChange}
            class="mt-1 h-6 font-mono text-xs"
            placeholder="#000000"
        />
    </div>
</div>
