<script lang="ts">
    import { licenseStore } from '$lib/stores/license'
    import { getPolarService } from '$lib/api/services/polar'

    import { Badge } from '$lib/components/ui/badge'
    import ProductDialog from '$lib/components/ProductDialog.svelte'
    import ManageSubscription from '$lib/components/ManageSubscription.svelte'

    let productList = $state([])
    let loading = $state(false)
    let activeProduct = $state(null)
    let view = $state<'plans' | 'license'>('plans')

    async function getProducts() {
        try {
            loading = true
            const products = await getPolarService().getProducts()
            const items =
                products?.items.filter(
                    (product) => !product.isArchived || product.id == $licenseStore?.product_id
                ) || []
            productList = items
            setActiveProduct()
        } catch (error) {
            console.error(error)
        } finally {
            loading = false
        }
    }

    function setActiveProduct() {
        if (!$licenseStore.product_id) return

        let userProduct = productList.find((product) => product!.id == $licenseStore.product_id)
        activeProduct = userProduct ?? null
    }

    function setView(event: MouseEvent) {
        const target = event.target as HTMLButtonElement
        view = target.id as 'plans' | 'license'
    }

    const showPlans = $derived(view == 'plans')
    // svelte-ignore state_referenced_locally
    const tier = $derived($licenseStore.status == 'granted' ? activeProduct?.name : '')

    onMount(() => {
        getProducts()
    })
</script>

<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-x-2">
            <h1>Subscription</h1>
            {#if tier}
                <span class="text-xs uppercase text-muted-foreground">{tier.split(' ').at(-1)}</span
                >
            {/if}
        </div>
        <div class="flex w-full justify-end gap-x-2">
            <Badge
                id="plans"
                onclick={setView}
                variant={showPlans ? 'default' : 'secondary'}
                class="h-5 cursor-pointer rounded-[2px] px-1.5 text-sm">plans</Badge
            >
            <Badge
                id="license"
                onclick={setView}
                variant={showPlans ? 'secondary' : 'default'}
                class="h-5 cursor-pointer rounded-[2px] px-1.5 text-sm">manage</Badge
            >
        </div>
    </div>
    {#if loading}
        <div class="grid w-full grid-cols-2 gap-2 gap-y-4">
            {#each Array(3) as _, i}
                <div
                    style="border: 2px solid white"
                    class="flex w-full flex-col items-center justify-center gap-2 rounded-md border p-2"
                >
                    <div class="h-4 w-24 bg-muted"></div>
                    <div class="h-4 w-16 bg-muted"></div>
                </div>
            {/each}
        </div>
    {:else}
        {#if showPlans}
            <div class="grid w-full grid-cols-2 place-content-center gap-2">
                {#each productList as product}
                    <ProductDialog {product} />
                {/each}
            </div>
        {/if}
        {#if !showPlans}
            <ManageSubscription />
        {/if}
    {/if}
</div>
