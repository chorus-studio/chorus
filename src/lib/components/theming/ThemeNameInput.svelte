<script lang="ts">
    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import { customThemesStore } from '$lib/stores/custom-themes'

    interface Props {
        value: string
        excludeId?: string
    }

    let { value = $bindable(''), excludeId }: Props = $props()

    const error = $derived.by(() => {
        if (!value.trim()) return 'Name is required'
        if (!customThemesStore.isNameUnique(value.trim(), excludeId)) {
            return 'A theme with this name already exists'
        }
        return undefined
    })

    const isValid = $derived(!error)
</script>

<div class="flex flex-col gap-2">
    <Label for="theme-name">Theme Name</Label>
    <Input
        id="theme-name"
        type="text"
        bind:value
        placeholder="My Custom Theme"
        class={error ? 'border-destructive' : ''}
    />
    {#if error}
        <p class="text-xs text-destructive">{error}</p>
    {/if}
</div>
