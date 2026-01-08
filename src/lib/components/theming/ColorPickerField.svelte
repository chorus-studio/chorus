<script lang="ts">
    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import * as Tooltip from '$lib/components/ui/tooltip'

    interface Props {
        label: string
        description?: string
        value: string
        onchange?: (value: string) => void
    }

    let { label, description, value = $bindable('#000000'), onchange }: Props = $props()

    let colorInputRef: HTMLInputElement | undefined = $state()

    function openColorPicker() {
        colorInputRef?.click()
    }

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
                <button
                    type="button"
                    aria-label="Pick color for {label}"
                    class="size-8 cursor-pointer rounded-md border border-muted-foreground"
                    style="background-color: {value}"
                    onclick={openColorPicker}
                ></button>
            </Tooltip.Trigger>
            <Tooltip.Content side="left">
                <p>{description ?? label}</p>
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

    <!-- Hidden native color input -->
    <input
        type="color"
        bind:this={colorInputRef}
        {value}
        oninput={handleColorChange}
        class="sr-only"
    />
</div>
