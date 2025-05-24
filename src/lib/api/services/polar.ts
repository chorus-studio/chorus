import { defineProxyService } from '@webext-core/proxy-service'

const DEV_API_URL = 'http://localhost:5173/api/polar'
const PROD_API_URL = 'https://chorusstudio.org/api/polar'
const API_URL = import.meta.env.DEV ? DEV_API_URL : PROD_API_URL

type CheckoutUrl = {
    customerId?: string
    productId: string
    productPriceId: string
    customerMetadata?: Record<string, string>
}

type ActivateLicenseKey = {
    key: string
    device_id: string
}

type ValidateLicenseKey = ActivateLicenseKey & {
    activation_id: string
}

export interface PolarService {
    getProducts(): Promise<unknown>
    openPolarUrl(url: string): Promise<void>
    generateCheckoutUrl(checkoutUrl: CheckoutUrl): string
    getCustomerPortalUrl(customerId: string): Promise<string>
    getCheckoutUrl(checkoutUrl: CheckoutUrl): Promise<string | undefined>
    validateLicenseKey({ key, device_id, activation_id }: ValidateLicenseKey): Promise<void>
    activateLicenseKey({ key, device_id }: ActivateLicenseKey): Promise<void>
}

export class PolarService implements PolarService {
    async openPolarUrl(url: string) {
        try {
            await chrome.tabs.create({ url, active: true })
        } catch (error) {
            console.error(error)
        }
    }

    async getCustomerPortalUrl(customerId: string) {
        try {
            const response = await fetch(`${API_URL}/portal?customerId=${customerId}`)
            const data = await response.json()
            return data.customerSession.customerPortalUrl
        } catch (e) {
            console.error(e)
        }
    }

    generateCheckoutUrl({ productId, productPriceId, customerId, customerMetadata }: CheckoutUrl) {
        const params = {
            products: productId,
            productPriceId,
            ...(customerId ? { customerId } : {}),
            ...(customerMetadata ? { customerMetadata: JSON.stringify(customerMetadata) } : {})
        }
        const queryParams = `?${new URLSearchParams(params)}`
        return `${API_URL}/checkout${queryParams}`
    }

    async getCheckoutUrl({
        productId,
        customerId,
        productPriceId,
        customerMetadata
    }: CheckoutUrl): Promise<string | undefined> {
        try {
            const url = this.generateCheckoutUrl({
                productId,
                productPriceId,
                customerId,
                customerMetadata
            })
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            return response.url
        } catch (e) {
            console.error(e)
        }
    }

    async getProducts() {
        try {
            const response = await fetch(`${API_URL}/products`, {
                method: 'GET'
            })
            const data = await response.json()
            return data.result
        } catch (e) {
            console.error(e)
        }
    }

    async activateLicenseKey({ key, device_id }: { key: string; device_id: string }) {
        const ua = (navigator as any).userAgentData
        const browserType =
            ua?.brands?.find(
                (brand: any) => !brand.brand.startsWith('Not') && brand.brand !== 'Chromium'
            )?.brand || 'Firefox'
        const label = `${ua.platform} ${browserType}`
        try {
            const response = await fetch(
                `${API_URL}/license/activate?key=${key}&device_id=${device_id}&label=${label}`
            )
            return await response.json()
        } catch (e) {
            console.error(e)
        }
    }

    async validateLicenseKey({ key, device_id, activation_id }: ValidateLicenseKey) {
        try {
            const response = await fetch(
                `${API_URL}/license/validate?key=${key}&device_id=${device_id}&activation_id=${activation_id}`
            )
            return await response.json()
        } catch (e) {
            console.error(e)
        }
    }
}

export const [registerPolarService, getPolarService] = defineProxyService(
    'PolarService',
    () => new PolarService()
)
