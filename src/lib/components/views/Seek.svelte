<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import SeekInput from '$lib/components/SeekInput.svelte'
    import ToggleSelect from '$lib/components/ToggleSelect.svelte'

    async function handleCheckedChange(ticked: boolean) {
        checked = ticked
        setting = ticked ? 'PA' : 'G'
        await seekStore.toggleLongForm()
    }

    $: checked = $seekStore.is_long_form
    $: setting = $seekStore.is_long_form ? 'PA' : 'G'
</script>

<div class="flex w-full flex-col justify-center space-y-3 py-2">
    <div class="flex items-center justify-between">
        <SeekInput type="rewind" />
        <SeekInput type="forward" />
    </div>

    <ToggleSelect
        label={setting === 'G' ? 'Global' : 'Podcasts/Audiobooks'}
        list={[
            { label: 'G', value: 'G' },
            { label: 'PA', value: 'PA' }
        ]}
        value={setting}
        onValueChange={(value: string) => (setting = value)}
    />
</div>
