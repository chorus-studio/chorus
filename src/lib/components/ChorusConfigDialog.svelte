<script lang="ts">
    import { licenseStore } from '$lib/stores/license'

    import * as Tabs from '$lib/components/ui/tabs'
    import Tippy from '$lib/components/Tippy.svelte'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Separator } from '$lib/components/ui/separator'
    import Settings2 from '@lucide/svelte/icons/settings-2'

    import ChorusConfigFXEQ from './ChorusConfigFXEQ.svelte'
    import ChorusConfigPresets from './ChorusConfigPresets.svelte'
    import ChorusConfigAutoSkip from './ChorusConfigAutoSkip.svelte'

    let activeTab = $state('presets')
    let granted = $derived($licenseStore.status === 'granted')
</script>

<!-- {#if granted} -->
<Dialog.Root>
    <Dialog.Trigger id="chorus-config-dialog-trigger" class="flex items-center justify-center">
        <Tippy text="config" side="bottom" class="size-7 [&_svg]:size-[18px]">
            <Settings2 class="size[18px] mt-0.5" />
        </Tippy>
    </Dialog.Trigger>
    <Dialog.Content
        id="chorus-config-dialog-content"
        class="absolute max-h-[90vh] w-3/4 max-w-3xl overflow-y-auto rounded-md bg-primary-foreground p-8"
    >
        <Dialog.Title class="text-2xl font-bold">Chorus Config</Dialog.Title>
        <Separator class="h-0.5 w-full" />
        <Tabs.Root bind:value={activeTab}>
            <Tabs.List class="flex w-full justify-between">
                <Tabs.Trigger value="auto-skip" class="w-full">Auto-Skip</Tabs.Trigger>
                <Tabs.Trigger value="fx-eq" class="w-full">FXEQ List</Tabs.Trigger>
                <Tabs.Trigger value="presets" class="w-full">Presets</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="auto-skip">
                <ChorusConfigAutoSkip />
            </Tabs.Content>
            <Tabs.Content value="fx-eq">
                <ChorusConfigFXEQ />
            </Tabs.Content>
            <Tabs.Content value="presets">
                <ChorusConfigPresets />
            </Tabs.Content>
        </Tabs.Root>
    </Dialog.Content>
</Dialog.Root>
<!-- {/if} -->
