import type { Playback } from '$lib/stores/playback'

type CacheItem<T> = {
    value: T
}

export type Snip = {
    start_time: number
    end_time: number
}

export type SimpleTrack = {
    song_id: string
    liked?: boolean | null
    track_id: string
    snip?: Snip | null
    playback?: Playback | null
    blocked?: boolean
}

export const COLLECTION_KEY = 'collection'
export const USER_COLLECTION_KEY = 'user_collection'

export type Collection = Record<string, SimpleTrack>
export type UserCollection = Record<string, boolean | null>

export class CacheStore {
    private prefix: string

    constructor(prefix: string = 'chorus_cache:') {
        this.prefix = prefix
    }

    private getKey(key: string): string {
        return `${this.prefix}${key}`
    }

    mergeCollection(collection: Collection): void {
        const currentCollection = this.get<Collection>(COLLECTION_KEY) ?? {}
        const mergedCollection = { ...currentCollection, ...collection }
        this.set(COLLECTION_KEY, mergedCollection)
    }

    updateTrackInCollection({
        track_id,
        value
    }: {
        track_id: string
        value: SimpleTrack | Partial<SimpleTrack>
    }): void {
        const collection = this.get<Collection>(COLLECTION_KEY) ?? {}
        if (!collection[track_id]) {
            collection[track_id] = value as SimpleTrack
        }

        // Create a new track object based on the existing track
        const updatedTrack = { ...collection[track_id] }

        // If snip or playback are null in the update value, remove those keys from the track
        if (value.snip === null) {
            delete value.snip
            delete updatedTrack.snip
        }
        if (value.playback === null) {
            delete value.playback
            delete updatedTrack.playback
        }

        // Apply the rest of the updates
        collection[track_id] = { ...updatedTrack, ...value }
        this.set(COLLECTION_KEY, collection)
    }

    set<T>(key: string, value: T): void {
        const item: CacheItem<T> = { value }
        sessionStorage.setItem(this.getKey(key), JSON.stringify(item))
    }

    get<T>(key: string): T | null {
        const item = sessionStorage.getItem(this.getKey(key))
        if (!item) return null

        const cached = JSON.parse(item) as CacheItem<T>
        return cached.value
    }

    delete(key: string): void {
        sessionStorage.removeItem(this.getKey(key))
    }

    clear(): void {
        const keys = Object.keys(sessionStorage)
        const keysToRemove: string[] = []
        
        // Collect keys first to avoid modifying sessionStorage during iteration
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            if (key.startsWith(this.prefix)) {
                keysToRemove.push(key)
            }
        }
        
        // Remove keys in batch
        for (const key of keysToRemove) {
            sessionStorage.removeItem(key)
        }
    }

    getAll<T>(): Record<string, T> {
        const result: Record<string, T> = {}
        const prefixLength = this.prefix.length
        
        // Use for loop instead of forEach for better performance
        const keys = Object.keys(sessionStorage)
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            if (key.startsWith(this.prefix)) {
                const shortKey = key.slice(prefixLength)
                const value = this.get<T>(shortKey)
                if (value !== null) {
                    result[shortKey] = value
                }
            }
        }

        return result
    }

    has(key: string): boolean {
        return sessionStorage.getItem(this.getKey(key)) !== null
    }
}
