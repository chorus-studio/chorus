<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import SeekInput from '$lib/components/SeekInput.svelte'

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

    <div class="flex w-full items-center justify-between">
        <div class="flex items-center">
            {#each ['G', 'PA'] as item}
                <span
                    id={`${item}-setting`}
                    class="{item === setting
                        ? 'bg-[green]'
                        : 'bg-transparent'} h-6 w-7 text-center font-bold text-white">{item}</span
                >
            {/each}
        </div>

        <div class="flex items-center justify-end gap-x-2">
            <Label class="text-base lowercase"
                >{setting === 'G' ? 'Global' : 'Podcasts/Audiobooks'}</Label
            >
            <Switch {checked} onCheckedChange={handleCheckedChange} />
        </div>
    </div>
</div>
