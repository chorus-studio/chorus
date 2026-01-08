<script lang="ts">
    import ColorPickerField from './ColorPickerField.svelte'
    import { Label } from '$lib/components/ui/label'

    interface Props {
        textColors: { text?: string; subtext?: string }
    }

    let { textColors = $bindable({}) }: Props = $props()

    // Get current values with defaults
    const textValue = $derived(textColors?.text ?? '#ffffff')
    const subtextValue = $derived(textColors?.subtext ?? '#b3b3b3')

    // Update handlers
    function updateTextColor(value: string) {
        textColors = {
            ...textColors,
            text: value !== '#ffffff' ? value : undefined
        }
    }

    function updateSubtextColor(value: string) {
        textColors = {
            ...textColors,
            subtext: value !== '#b3b3b3' ? value : undefined
        }
    }
</script>

<div class="flex flex-col gap-3">
    <div>
        <Label class="text-sm font-medium">Text Colors (Optional)</Label>
        <p class="text-xs text-muted-foreground">
            Override text colors for better readability on your background.
        </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
        <ColorPickerField
            label="Text"
            description="Main text color"
            value={textValue}
            onchange={updateTextColor}
        />
        <ColorPickerField
            label="Subtext"
            description="Secondary text color"
            value={subtextValue}
            onchange={updateSubtextColor}
        />
    </div>
</div>
