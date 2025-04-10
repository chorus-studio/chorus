<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import SeekInput from '$lib/components/SeekInput.svelte'
    import ToggleSelect from '$lib/components/ToggleSelect.svelte'

    let { pip = false }: { pip?: boolean } = $props()

    async function handleValueChange(value: string) {
        await seekStore.updateSeek({ is_long_form: value === 'PA' })
    }

    const setting = $derived($seekStore.is_long_form ? 'PA' : 'D')
</script>

<div class="flex w-full flex-col justify-center space-y-2 py-2">
    <div class="flex items-center justify-between">
        <SeekInput type="rewind" />
        <SeekInput type="forward" />
    </div>

    <ToggleSelect
        {pip}
        label={setting === 'D' ? 'Default' : 'Podcasts/Audiobooks'}
        list={[
            { label: 'D', value: 'D' },
            { label: 'PA', value: 'PA' }
        ]}
        value={setting}
        onValueChange={handleValueChange}
    />
</div>
