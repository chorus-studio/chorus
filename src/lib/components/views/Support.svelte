<script lang="ts">
    import { mellowtel } from '$lib/utils/mellowtel'
    import { isSupporter } from '$lib/stores/supporter'

    import { Badge } from '$lib/components/ui/badge'
    import SupportDialog from '$lib/components/SupportDialog.svelte'

    let supporting = false

    const checkOptInStatus = async () => {
        supporting = await mellowtel.getOptInStatus()
        console.log('supporting', supporting)
        isSupporter.set(supporting)
    }

    onMount(() => checkOptInStatus())
</script>

<div class="flex h-full w-full flex-col items-center justify-center space-y-2">
    <div class="flex w-full justify-between">
        <div class="mr-2 flex w-1/2 flex-col gap-y-2">
            <div class="flex items-center gap-x-2">
                <h2 class="text-base font-semibold">tier:</h2>
                <Badge variant={$isSupporter ? 'default' : 'outline'}
                    >{$isSupporter ? 'supporter' : 'basic'}</Badge
                >
            </div>
            <div class="flex gap-x-2">
                <SupportDialog />
            </div>
        </div>
    </div>
</div>
