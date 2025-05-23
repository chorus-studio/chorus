import { toast } from 'svelte-sonner'
import { storage } from '@wxt-dev/storage'
import { writable, get } from 'svelte/store'
import { syncWithType } from '$lib/utils/store-utils'
import { getPolarService } from '$lib/api/services/polar'

export const LICENSE_STORE_KEY = 'local:chorus_license'

export type LicenseState = {
    hash: string
    key: string
    salt: string
    status: string
    device_id: string
    product_id: string
    customer_id: string
    display_key: string
    activation_id: string
    license_key_id: string
    last_validated_at: string
    next_validated_at: string
}

const defaultLicense: LicenseState = {
    hash: '',
    key: '',
    salt: '',
    status: '',
    device_id: '',
    product_id: '',
    customer_id: '',
    display_key: '',
    activation_id: '',
    license_key_id: '',
    last_validated_at: '',
    next_validated_at: ''
}

function createLicenseStore() {
    const store = writable<LicenseState>(defaultLicense)
    const { subscribe, update, set } = store
    let isUpdatingStorage = false

    function daysSinceLastValidation(days: number = 7) {
        const now = new Date()
        const date = get(store).last_validated_at ?? new Date().toISOString()
        const lastValidatedAt = new Date(date)
        const diffTime = Math.abs(now.getTime() - lastValidatedAt.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24))
        return diffDays >= days
    }

    function toastError(message?: string) {
        toast.error(message || 'License key is inactive.', {
            description: 'Please check your license status from settings portal.'
        })
    }

    async function validateLicense() {
        const { hash, status } = get(store)
        if (!status || !hash) return
        if (status !== 'granted') return toastError()

        const hashesMatch = await verifyLicenseHash()
        const shouldValidate = daysSinceLastValidation(7)

        if (hashesMatch && !shouldValidate) return
        if (!hashesMatch || (hashesMatch && shouldValidate)) {
            try {
                const item = await getPolarService().validateLicenseKey({
                    key: get(store).key,
                    device_id: get(store).device_id,
                    activation_id: get(store).activation_id
                })

                if (item?.error) {
                    toastError(item?.error)
                    return await updateLicense({ status: 'inactive' })
                }
                if (!item?.error) {
                    const status = item?.status
                    if (status !== 'granted') {
                        toastError()
                        return await updateLicense({ status: 'inactive' })
                    }
                    await updateLicenseItem({ item, device_id: get(store).device_id })
                }
            } catch (error) {
                console.error('Error validating license: ', error)
            }
        }
    }

    async function verifyLicenseHash() {
        const savedHash = get(store).hash
        if (!savedHash) {
            throw new Error('No license hash found')
        }
        try {
            const computedHash = await generateLicenseHash()
            return savedHash === computedHash
        } catch (error) {
            console.error('Error verifying license hash: ', error)
            return false
        }
    }

    function getNextValidatedAt({ date, daysFromNow = 7 }: { date: string; daysFromNow?: number }) {
        const now = new Date(date)
        const nextValidatedAt = new Date(now.getTime() + 1000 * 3600 * 24 * daysFromNow)
        return nextValidatedAt.toISOString()
    }

    async function getHash({ device_id, item }: { device_id: string; item: any }) {
        const last_validated_at = item?.lastValidatedAt ?? new Date().toISOString()
        const salt = item?.meta?.salt ?? item?.activation?.meta?.salt ?? get(store).salt
        const hashData = {
            salt,
            device_id,
            last_validated_at,
            key: item?.licenseKey?.key ?? item?.key,
            next_validated_at: getNextValidatedAt({ date: last_validated_at })
        }
        const hash = await licenseStore.generateLicenseHash(hashData)
        return { hashData, hash }
    }

    async function updateLicenseItem({ item, device_id }: { item: any; device_id: string }) {
        const { hash, hashData } = await getHash({ device_id, item })
        await licenseStore.updateLicense({
            ...hashData,
            hash,
            activation_id: item?.id ?? item.activation.id,
            status: item?.licenseKey?.status ?? item.status,
            license_key_id: item?.licenseKey?.id ?? item.id,
            customer_id: item?.licenseKey?.customerId ?? item.customerId,
            display_key: item?.displayKey ?? item.licenseKey.displayKey,
            product_id:
                item?.customer?.metadata?.product_id ?? item.licenseKey.customer.metadata.product_id
        })
    }

    async function activateLicense(licenseKey: string) {
        const device_id = crypto.randomUUID()
        try {
            const item = await getPolarService().activateLicenseKey({
                device_id,
                key: licenseKey
            })
            if (!item?.error) await updateLicenseItem({ item, device_id })
            if (item?.error) toastError(item?.error)
        } catch (error) {
            console.error('Error activating license: ', error)
            throw error
        }
    }

    async function generateLicenseHash(hashData?: Partial<LicenseState>) {
        const { key, device_id, last_validated_at, salt, next_validated_at } =
            hashData ?? get(store)
        if (!key || !device_id || !last_validated_at || !salt || !next_validated_at) {
            throw new Error('Missing required fields')
        }

        const encoder = new TextEncoder()
        const data = `${device_id}|${key}|${last_validated_at}|${next_validated_at}|${salt}`
        const encoded = encoder.encode(data)
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
    }

    async function updateLicense(license: Partial<LicenseState>) {
        update((state) => ({ ...state, ...license }))
        await storage.setItem(LICENSE_STORE_KEY, get(store))
    }

    storage
        .getItem<LicenseState>(LICENSE_STORE_KEY, { fallback: defaultLicense })
        .then((savedState) => {
            if (!savedState) return

            // Sync the stored loop with the current type definition
            const syncedState = syncWithType(savedState, defaultLicense)
            set(syncedState)

            // Update storage with synced state
            isUpdatingStorage = true
            storage
                .setItem<LicenseState>(LICENSE_STORE_KEY, syncedState)
                .then(() => {
                    isUpdatingStorage = false
                })
                .catch((error) => {
                    console.error('Error updating storage:', error)
                    isUpdatingStorage = false
                })
        })

    storage.watch<LicenseState>(LICENSE_STORE_KEY, (newState) => {
        if (!newState || isUpdatingStorage) return

        const syncedState = syncWithType(newState, defaultLicense)
        set(syncedState)
    })

    return {
        subscribe,
        updateLicense,
        activateLicense,
        validateLicense,
        verifyLicenseHash,
        generateLicenseHash
    }
}

export const licenseStore = createLicenseStore()
