<script lang="ts">
    import { supporterStore } from '$lib/stores/supporter'

    import { Badge } from '$lib/components/ui/badge'
    import SupportDialog from '$lib/components/SupportDialog.svelte'

    let triggerText = 'Support'

    const checkOptInStatus = async () => {
        await supporterStore.sync()
        triggerText = $supporterStore.isSupporter ? 'Manage' : 'Support'
    }

    onMount(() => checkOptInStatus())
</script>

<div class="flex h-full w-full flex-col justify-between space-y-2">
    <div class="flex h-full w-full justify-between">
        <div class="flex w-full flex-col gap-y-2 space-y-4">
            <div class="flex items-center gap-x-2">
                <h2 class="text-base font-semibold underline">tier:</h2>
                <Badge variant="default"
                    >{$supporterStore.isSupporter ? 'supporter' : 'basic'}</Badge
                >
            </div>
            <article class="flex w-full text-sm">
                Want to help support the ongoing development of chorus? Become a supporter!
                Supporters get access to exclusive upcoming features for FREE!
            </article>
            <div class="flex justify-end">
                <SupportDialog {triggerText} />
            </div>
        </div>
    </div>
</div>
