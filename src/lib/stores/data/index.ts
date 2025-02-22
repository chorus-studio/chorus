import { CacheStore, COLLECTION_KEY } from './cache'
import type { Collection, SimpleTrack } from './cache'
import type { NowPlaying } from '$lib/stores/now-playing'

class DataStore {
    private cache: CacheStore

    constructor() {
        this.cache = new CacheStore()
    }

    get<T>(key: string): T | null {
        return this.cache.get<T>(key)
    }

    set<T>(key: string, value: T): void {
        this.cache.set<T>(key, value)
    }

    delete(key: string): void {
        this.cache.delete(key)
    }

    clear(): void {
        this.cache.clear()
    }

    mergeCollection(collection: Collection) {
        this.cache.mergeCollection(collection)
    }

    get collection_ids(): string[] {
        return this.collection.map((track) => track.track_id)
    }

    get blocked(): SimpleTrack[] {
        return this.collection.filter((track) => track.blocked)
    }

    get liked(): SimpleTrack[] {
        return this.collection.filter((track) => track.liked)
    }

    get snipped(): SimpleTrack[] {
        return this.collection.filter((track) => track.snipped)
    }

    get collectionObject(): Collection {
        return this.get<Collection>(COLLECTION_KEY) ?? {}
    }

    get collection(): SimpleTrack[] {
        return Object.values(this.collectionObject)
    }

    updateTrack({ track_id, value }: { track_id: string; value: Partial<SimpleTrack> }) {
        this.cache.updateTrackInCollection({ track_id, value })
    }

    generateSimpleTrack(track: NowPlaying) {
        const fullTrack = {
            song_id: track.id!,
            liked: track.liked,
            snipped: false,
            blocked: false,
            start_time: 0,
            end_time: track.duration,
            track_id: track.track_id
        } as SimpleTrack
        this.updateTrack({ track_id: fullTrack.track_id!, value: fullTrack })
    }
}

export const dataStore = new DataStore()
