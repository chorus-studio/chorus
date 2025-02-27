import { storage } from '@wxt-dev/storage'
import type { NowPlaying } from '$lib/stores/now-playing'
import type { Collection, SimpleTrack, UserCollection } from './cache'
import { CacheStore, COLLECTION_KEY, USER_COLLECTION_KEY } from './cache'

class DataStore {
    private cache: CacheStore

    constructor() {
        this.cache = new CacheStore()
        this.populate()
    }

    async populate() {
        const userCollection = await storage.getItem('local:chorus_collection')
        if (userCollection) {
            const currentCollection = this.get<Collection>(COLLECTION_KEY)
            if (currentCollection) {
                const mergedCollection = { ...currentCollection, ...userCollection }
                this.cache.set(COLLECTION_KEY, mergedCollection)
            } else {
                this.cache.set(COLLECTION_KEY, userCollection as Collection)
            }
        }
    }

    async saveToExtensionStorage(track: SimpleTrack) {
        const userCollection =
            (await storage.getItem<Record<string, SimpleTrack>>('local:chorus_collection')) ?? {}
        if (userCollection) {
            userCollection[track.track_id] = track
            await storage.setItem('local:chorus_collection', userCollection)
        }
    }

    async removeFromExtensionStorage(track_id: string) {
        const userCollection =
            (await storage.getItem<Record<string, SimpleTrack>>('local:chorus_collection')) ?? {}
        if (userCollection?.[track_id]) {
            delete userCollection[track_id]
            await storage.setItem('local:chorus_collection', userCollection)
        }
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

    getTrack(track_id: string) {
        return this.collectionObject[track_id]
    }

    async updateTrack({ track_id, value }: { track_id: string; value: Partial<SimpleTrack> }) {
        this.cache.updateTrackInCollection({ track_id, value })
        const track = this.collectionObject[track_id]
        if (!track) return

        if (!track.snipped && !track.blocked) {
            await this.removeFromExtensionStorage(track_id)
        } else {
            await this.saveToExtensionStorage(track)
        }
    }

    generateSimpleTrack(track: NowPlaying) {
        const fullTrack = {
            song_id: track.id!,
            liked: this.checkInUserCollection(track.track_id!),
            snipped: false,
            blocked: false,
            start_time: 0,
            end_time: track.duration,
            track_id: track.track_id
        } as SimpleTrack
        this.updateTrack({ track_id: fullTrack.track_id!, value: fullTrack })
    }

    checkInUserCollection(track_id: string) {
        if (!track_id) return false

        const userCollection = this.get<UserCollection>(USER_COLLECTION_KEY) ?? {}
        this.removeUndefinedUserTracks(userCollection)

        if (!userCollection?.[track_id]) {
            this.updateUserCollection({ track_id, liked: false })
            return false
        }
        return userCollection[track_id]
    }

    updateUserCollection({ track_id, liked }: { track_id: string; liked: boolean }) {
        const userCollection = this.get<UserCollection>(USER_COLLECTION_KEY) ?? {}
        userCollection[track_id] = liked
        this.set(USER_COLLECTION_KEY, userCollection)
        this.removeUndefinedUserTracks(userCollection)
    }

    removeUndefinedUserTracks(collection: UserCollection) {
        Object.keys(collection).forEach((track_id) => {
            if (track_id == 'undefined') {
                delete collection[track_id]
            }
        })
        this.set(USER_COLLECTION_KEY, collection)
    }
}

export const dataStore = new DataStore()
