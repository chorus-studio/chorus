<script lang="ts">
    import { toast } from 'svelte-sonner'
    import { licenseStore } from '$lib/stores/license'

    import Send from '@lucide/svelte/icons/send'
    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import { Switch } from '$lib/components/ui/switch'
    import Loader from '@lucide/svelte/icons/loader-circle'

    let loading = $state(false)
    let editMode = $state(!$licenseStore.display_key)
    let licenseKey = $state<string>($licenseStore.display_key)

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        try {
            loading = true
            await licenseStore.activateLicense(licenseKey)
            loading = false
        } catch (error) {
            console.error('Error in activating license key: ', error)
            toast.error('Error activating license key. Please try again.')
        } finally {
            loading = false
            editMode = false
        }
    }

    function toggleEditMode(checked: boolean) {
        editMode = checked
        const key = checked ? '' : $licenseStore.display_key
        licenseKey = key || ''
    }
</script>

<form class="flex w-full flex-col justify-between gap-2" onsubmit={handleSubmit}>
    <div class="flex w-full flex-col gap-2 space-y-1">
        <div class="flex items-center justify-between gap-2">
            <Label for="license-key" class="text-sm">License Key</Label>

            <div class="sm:hidden flex flex-row items-center justify-end gap-2">
                <Label for="toggle-edit" class="sm:text-sm text-xs">Edit</Label>
                <Switch id="toggle-edit" bind:checked={editMode} onCheckedChange={toggleEditMode} />
            </div>
        </div>
        <Input
            id="license-key"
            bind:value={licenseKey}
            disabled={!editMode || loading}
            autocomplete="off"
            autocorrect="off"
            class="w-full truncate text-xs"
            placeholder="CHORUS_XXXXXXXX-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
        />
    </div>

    <div class="flex w-full justify-end">
        <Button
            variant="outline"
            size="sm"
            type="submit"
            disabled={!editMode || loading}
            class="w-24 text-sm [&:svg]:size-4"
        >
            {$licenseStore.display_key && editMode ? 'Update' : 'Activate'}
            {#if loading}
                <Loader class="size-4 animate-spin" />
            {:else}
                <Send class="size-4" />
            {/if}
        </Button>
    </div>
</form>
