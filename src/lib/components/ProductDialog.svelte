<script lang="ts">
    import { marked } from 'marked'
    import { toast } from 'svelte-sonner'
    import { licenseStore } from '$lib/stores/license'
    import { getPolarService } from '$lib/api/services/polar'

    import * as Card from '$lib/components/ui/card'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Button, buttonVariants } from '$lib/components/ui/button'

    let { product } = $props()

    function formatPrice() {
        const price = product.prices.at(0)

        const locale = navigator.language.split('-').at(0)
        const formattedPrice = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: price.priceCurrency
        }).format(price.priceAmount / 100)

        const priceType = price?.type == 'recurring' ? ` / ${price.recurringInterval}` : ''
        const finalPrice = `${formattedPrice} ${price?.priceCurrency.toUpperCase()}${priceType}`
        return finalPrice
    }

    async function openLinkInActiveWindow(url: string) {
        try {
            await getPolarService().openPolarUrl(url)
        } catch (error) {
            toast.error('Failed to open checkout url')
            console.error('Error in openLinkInActiveWindow: ', error)
        }
    }

    async function handleUpgrade() {
        try {
            const url = await getPolarService().getCheckoutUrl({
                productId: product.id,
                productPriceId: product.prices.at(0)?.id,
                customerMetadata: {
                    product_id: product.id,
                    product_name: product.name
                },
                ...($licenseStore.customer_id ? { customerId: $licenseStore.customer_id } : {})
            })

            if (url) {
                await openLinkInActiveWindow(url)
            } else {
                toast.error('Failed to get checkout url')
            }
        } catch (error) {
            toast.error('Failed to upgrade')
            console.error('Error in handleUpgrade: ', error)
        }
    }

    const isSubscribedToProduct = $licenseStore.product_id == product.id
</script>

<Dialog.Root>
    <Dialog.Trigger
        disabled={isSubscribedToProduct}
        class={isSubscribedToProduct ? 'cursor-not-allowed' : ''}
    >
        <Button
            id={product.id}
            variant={isSubscribedToProduct ? 'secondary' : 'outline'}
            class="flex h-16 w-full flex-col items-center justify-center gap-2 rounded-md border p-2"
        >
            <span class="text-xs text-secondary-foreground">{product.name}</span>
            <span class="text-xs text-secondary-foreground">{formatPrice()}</span>
        </Button>
    </Dialog.Trigger>

    <Dialog.Content class="flex max-w-2xl flex-col rounded-md p-0">
        <Card.Root class="space-y-3">
            <Card.Header class="flex flex-row items-center justify-between">
                <Card.Title class="text-xl font-bold">{product.name}</Card.Title>
            </Card.Header>
            <Card.Content>
                <article class="prose prose-sm dark:prose-invert max-w-none">
                    {@html marked(product.description)}
                </article>
            </Card.Content>
            <Card.Footer class="flex justify-between gap-4">
                <p class="text-sm">{formatPrice()}</p>
                <div class="flex flex-row justify-end gap-2">
                    <Dialog.Close class={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        Cancel
                    </Dialog.Close>
                    <Dialog.Close>
                        <Button onclick={handleUpgrade} size="sm" class="text-sm">
                            {product.prices.at(0)?.type == 'recurring' ? 'Subscribe' : 'Upgrade'}
                        </Button>
                    </Dialog.Close>
                </div>
            </Card.Footer>
        </Card.Root>
    </Dialog.Content>
</Dialog.Root>
