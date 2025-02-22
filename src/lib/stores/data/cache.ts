type CacheItem<T> = {
    value: T
}

export type SimpleTrack = {
    song_id: string
    liked: boolean
    snipped: boolean
    track_id: string
    blocked: boolean
    end_time: number
    start_time: number
}

export const COLLECTION_KEY = 'collection'

export type Collection = Record<string, SimpleTrack>

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
        collection[track_id] = collection[track_id]
            ? { ...collection[track_id], ...value }
            : (value as SimpleTrack)
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
        keys.forEach((key) => {
            if (key.startsWith(this.prefix)) {
                sessionStorage.removeItem(key)
            }
        })
    }

    getAll<T>(): Record<string, T> {
        const result: Record<string, T> = {}
        const keys = Object.keys(sessionStorage)

        keys.forEach((key) => {
            if (key.startsWith(this.prefix)) {
                const value = this.get<T>(key.slice(this.prefix.length))
                if (value) {
                    result[key.slice(this.prefix.length)] = value
                }
            }
        })

        return result
    }

    has(key: string): boolean {
        return sessionStorage.getItem(this.getKey(key)) !== null
    }
}
