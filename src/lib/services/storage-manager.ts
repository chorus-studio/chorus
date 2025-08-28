import { storage } from '@wxt-dev/storage'
import { writable, type Writable } from 'svelte/store'

/**
 * Centralized storage management service
 * Eliminates boilerplate code across store implementations
 */
export abstract class BaseStorageStore<T> {
    protected store: Writable<T>
    protected storageKey: string
    protected isUpdatingStorage: boolean = false
    protected defaultValue: T

    constructor(storageKey: string, defaultValue: T) {
        this.storageKey = storageKey
        this.defaultValue = defaultValue
        this.store = writable(defaultValue)
        this.initialize()
    }

    /**
     * Initialize the store with data from storage
     */
    private async initialize(): Promise<void> {
        try {
            const storedValue = await this.getFromStorage()
            if (storedValue !== null) {
                this.store.set(storedValue)
            }
        } catch (error) {
            console.warn(`Failed to initialize store ${this.storageKey}:`, error)
        }
    }

    /**
     * Get the Svelte store for reactive subscriptions
     */
    getStore(): Writable<T> {
        return this.store
    }

    /**
     * Get current value from storage
     */
    protected async getFromStorage(): Promise<T | null> {
        try {
            const item = await storage.getItem(`local:${this.storageKey}` as const)
            return (item as any)?.value ?? null
        } catch (error) {
            console.warn(`Storage read error for ${this.storageKey}:`, error)
            return null
        }
    }

    /**
     * Save value to storage with error handling
     */
    protected async saveToStorage(value: T): Promise<boolean> {
        if (this.isUpdatingStorage) return false

        this.isUpdatingStorage = true
        try {
            await storage.setItem(`local:${this.storageKey}` as const, { value })
            return true
        } catch (error) {
            console.error(`Storage write error for ${this.storageKey}:`, error)
            return false
        } finally {
            this.isUpdatingStorage = false
        }
    }

    /**
     * Update store state and save to storage
     */
    async updateState(updates: Partial<T>): Promise<boolean> {
        try {
            this.store.update(current => {
                const newState = { ...current, ...updates }
                // Don't await storage save in the update function to avoid blocking UI
                this.saveToStorage(newState).catch(error => {
                    console.error(`Delayed storage save failed for ${this.storageKey}:`, error)
                })
                return newState
            })
            return true
        } catch (error) {
            console.error(`State update error for ${this.storageKey}:`, error)
            return false
        }
    }

    /**
     * Reset store to default value
     */
    async reset(): Promise<void> {
        this.store.set(this.defaultValue)
        await this.saveToStorage(this.defaultValue)
    }

    /**
     * Get current state value synchronously (use sparingly)
     */
    getCurrentState(): T {
        let currentValue = this.defaultValue
        this.store.subscribe(value => {
            currentValue = value
        })()
        return currentValue
    }

    /**
     * Subscribe to store changes with cleanup
     */
    subscribe(callback: (value: T) => void): () => void {
        return this.store.subscribe(callback)
    }

    /**
     * Check if store is currently syncing with storage
     */
    get isStoragePending(): boolean {
        return this.isUpdatingStorage
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // Override in subclasses for additional cleanup
    }
}

/**
 * Storage manager for simple key-value operations
 */
export class StorageManager {
    private static instance: StorageManager
    private cache: Map<string, any> = new Map()
    private cacheTimestamps: Map<string, number> = new Map()
    private readonly CACHE_DURATION = 5000 // 5 seconds

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager()
        }
        return StorageManager.instance
    }

    /**
     * Get value with caching
     */
    async get<T>(key: string, useCache: boolean = true): Promise<T | null> {
        // Check cache first
        if (useCache && this.isCacheValid(key)) {
            return this.cache.get(key)
        }

        try {
            const storageKey = key.includes(':') ? key : `local:${key}`
            const item = await storage.getItem(storageKey as any)
            const value = (item as any)?.value ?? null
            
            if (useCache && value !== null) {
                this.cache.set(key, value)
                this.cacheTimestamps.set(key, Date.now())
            }
            
            return value
        } catch (error) {
            console.error(`Storage get error for key ${key}:`, error)
            return null
        }
    }

    /**
     * Set value with cache invalidation
     */
    async set<T>(key: string, value: T): Promise<boolean> {
        try {
            const storageKey = key.includes(':') ? key : `local:${key}`
            await storage.setItem(storageKey as any, { value })
            
            // Update cache
            this.cache.set(key, value)
            this.cacheTimestamps.set(key, Date.now())
            
            return true
        } catch (error) {
            console.error(`Storage set error for key ${key}:`, error)
            return false
        }
    }

    /**
     * Remove value and clear from cache
     */
    async remove(key: string): Promise<boolean> {
        try {
            const storageKey = key.includes(':') ? key : `local:${key}`
            await storage.removeItem(storageKey as any)
            this.cache.delete(key)
            this.cacheTimestamps.delete(key)
            return true
        } catch (error) {
            console.error(`Storage remove error for key ${key}:`, error)
            return false
        }
    }

    /**
     * Batch get multiple keys
     */
    async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
        const results: Record<string, T | null> = {}
        
        const promises = keys.map(async key => {
            const value = await this.get<T>(key)
            results[key] = value
        })
        
        await Promise.allSettled(promises)
        return results
    }

    /**
     * Batch set multiple values
     */
    async setMultiple<T>(values: Record<string, T>): Promise<boolean[]> {
        const promises = Object.entries(values).map(([key, value]) => 
            this.set(key, value)
        )
        
        const results = await Promise.allSettled(promises)
        return results.map(result => result.status === 'fulfilled' && result.value)
    }

    /**
     * Clear cache for performance
     */
    clearCache(): void {
        this.cache.clear()
        this.cacheTimestamps.clear()
    }

    /**
     * Check if cached value is still valid
     */
    private isCacheValid(key: string): boolean {
        if (!this.cache.has(key)) return false
        
        const timestamp = this.cacheTimestamps.get(key)
        if (!timestamp) return false
        
        return Date.now() - timestamp < this.CACHE_DURATION
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; hitRate: number } {
        return {
            size: this.cache.size,
            hitRate: 0 // TODO: Implement hit rate tracking if needed
        }
    }
}

// Singleton instance
export const storageManager = StorageManager.getInstance()

/**
 * Utility functions for common storage patterns
 */
export class StorageUtils {
    /**
     * Create a debounced storage saver to prevent excessive writes
     */
    static createDebouncedSaver<T>(
        key: string,
        delay: number = 300
    ): (value: T) => void {
        let timeoutId: NodeJS.Timeout | null = null
        
        return (value: T) => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            
            timeoutId = setTimeout(async () => {
                await storageManager.set(key, value)
                timeoutId = null
            }, delay)
        }
    }

    /**
     * Create a storage-backed reactive store
     */
    static createStorageStore<T>(
        key: string,
        defaultValue: T
    ): BaseStorageStore<T> {
        return new (class extends BaseStorageStore<T> {
            constructor() {
                super(key, defaultValue)
            }
        })()
    }

    /**
     * Migrate storage data with version management
     */
    static async migrateStorage<T>(
        key: string,
        currentVersion: number,
        migrationMap: Record<number, (data: any) => T>
    ): Promise<T | null> {
        try {
            const stored = await storageManager.get<{ version?: number; data: T }>(key)
            if (!stored) return null

            const storedVersion = stored.version ?? 1
            let data = stored.data

            // Apply migrations in sequence
            for (let version = storedVersion; version < currentVersion; version++) {
                const migration = migrationMap[version + 1]
                if (migration) {
                    data = migration(data)
                }
            }

            // Save migrated data
            if (storedVersion < currentVersion) {
                await storageManager.set(key, { version: currentVersion, data })
            }

            return data
        } catch (error) {
            console.error(`Storage migration error for ${key}:`, error)
            return null
        }
    }
}