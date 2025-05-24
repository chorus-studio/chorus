<script lang="ts">
    import { toast } from 'svelte-sonner'
    import { licenseStore } from '$lib/stores/license'
    import { getPolarService } from '$lib/api/services/polar'

    import { Button } from './ui/button'
    import LicenseKey from './LicenseKey.svelte'

    async function getCustomerPortalUrl() {
        const UNAUTHENTICATED_PORTAL_URL = 'https://polar.sh/portal'
        if (!$licenseStore.customer_id) return UNAUTHENTICATED_PORTAL_URL

        try {
            return await getPolarService().getCustomerPortalUrl($licenseStore.customer_id)
        } catch (error) {
            console.error('Error in getCustomerPortalUrl: ', error)
            return UNAUTHENTICATED_PORTAL_URL
        }
    }

    async function handleManage() {
        try {
            const url = await getCustomerPortalUrl()
            await getPolarService().openPolarUrl(url)
        } catch (error) {
            toast.error('Error opening customer portal. Please try again.')
            console.error('Error in handleManage: ', error)
        }
    }
</script>

<div class="flex flex-col gap-4">
    <LicenseKey />
    <div class="absolute bottom-0 flex w-full">
        <Button variant="outline" size="sm" class="h-8" onclick={handleManage}>User Portal</Button>
    </div>
</div>
