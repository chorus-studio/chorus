import { storage } from '@wxt-dev/storage'
import type { NowPlaying } from '$lib/stores/now-playing'
import { migrateSnip } from '$lib/utils/snip-ranges'
import { CacheStore, COLLECTION_KEY, USER_COLLECTION_KEY } from './cache'
import type { Collection, SimpleTrack, UserCollection } from './cache'

interface OldTrackData {
    id?: string
    trackId?: string
    isSnip?: boolean
    isSkipped?: boolean
    startTime?: number
    endTime?: number
    url?: string
}

class DataStore {
    private cache: CacheStore
    private LEGACY_KEYS = {
        toRemove: [
            'enabled',
            'popup-ui',
            'now-playing',
            'chorus-seek',
            'equalizer',
            'reverb',
            'connection_id',
            'device_id',
            'globals',
            'auth_token'
        ],
        identifier: ' by '
    }

    constructor() {
        this.cache = new CacheStore()
        this.initialize()
    }

    async initialize() {
        sessionStorage.setItem('chorus:sounds_path', chrome.runtime.getURL('sounds/'))
        sessionStorage.setItem('chorus:reverb_path', chrome.runtime.getURL('processor.js'))
        sessionStorage.setItem('chorus:soundtouch_path', chrome.runtime.getURL('soundtouch.js'))
        sessionStorage.setItem('chorus:ms_processor_path', chrome.runtime.getURL('ms-processor.js'))

        await this.sync()
        await this.populate()
    }

    private isValidTrackData(trackData: Partial<OldTrackData>): boolean {
        return Boolean(
            trackData?.trackId &&
                trackData?.id &&
                trackData?.url?.includes('track') &&
                trackData?.endTime &&
                trackData?.trackId === trackData?.url?.split('/')?.at(-1) &&
                (trackData?.isSkipped || trackData?.isSnip)
        )
    }

    private convertToNewFormat(trackData: Partial<OldTrackData>): SimpleTrack {
        const snip = trackData.isSnip
            ? migrateSnip({ start_time: trackData.startTime, end_time: trackData.endTime })
            : null

        const blocked = trackData.isSkipped ? { blocked: true } : {}

        return {
            song_id: trackData.id!,
            liked: false,
            track_id: trackData.trackId!,
            ...(snip ? { snip } : {}),
            ...blocked
        }
    }

    /**
     * Bring every stored snip up to the current shape (`{ mode, ranges }`); a
     * collection written by an older build holds `{ start_time, end_time }`.
     */
    private migrateSnips(collection: Collection): { collection: Collection; changed: boolean } {
        let changed = false
        const migrated: Collection = {}
        for (const [track_id, track] of Object.entries(collection)) {
            if (track.snip == null) {
                migrated[track_id] = track
                continue
            }
            const snip = migrateSnip(track.snip)
            if (snip === track.snip) {
                migrated[track_id] = track
                continue
            }
            changed = true
            const { snip: _legacy, ...rest } = track
            migrated[track_id] = snip ? { ...rest, snip } : rest
        }
        return { collection: migrated, changed }
    }

    private async cleanupLegacyData(): Promise<void> {
        await chrome.storage.local.remove(this.LEGACY_KEYS.toRemove)
    }

    private async processTrackData(oldData: Record<string, any>): Promise<Collection> {
        const newCollection: Collection = {}
        const trackKeys = Object.keys(oldData).filter((key) =>
            key.includes(this.LEGACY_KEYS.identifier)
        )

        for (const key of trackKeys) {
            try {
                if (!oldData[key]) continue

                const trackData = JSON.parse(oldData[key]) as Partial<OldTrackData>

                if (!this.isValidTrackData(trackData)) {
                    console.warn(`Invalid track data for key: ${key}`)
                    continue
                }

                if (trackData.isSnip || trackData.isSkipped) {
                    newCollection[trackData.trackId!] = this.convertToNewFormat(trackData)
                }
            } catch (error) {
                console.error(`Failed to process track data for key: ${key}`, error)
            }
        }

        return newCollection
    }

    private async migrateCollection(collection: Collection): Promise<void> {
        if (Object.keys(collection).length === 0) return

        this.mergeCollection(collection)
        await this.populateFromExtensionStorage(collection)
    }

    async sync(): Promise<void> {
        try {
            const migrationVersion = await storage.getItem('local:chorus_migration_version')
            if (migrationVersion === '2.0.0') return

            const oldData = await chrome.storage.local.get(null)
            if (!oldData || Object.keys(oldData).length === 0) return

            const newCollection = await this.processTrackData(oldData)
            await this.migrateCollection(newCollection)
            await this.cleanupLegacyData()

            await storage.setItem('local:chorus_migration_version', '2.0.0')
        } catch (error) {
            console.error('Migration failed:', error)
            throw error
        }
    }

    async populate() {
        const stored = await storage.getItem<Collection>('local:chorus_collection')
        if (stored) {
            const { collection: storedCollection, changed } = this.migrateSnips(stored)
            if (changed) await storage.setItem('local:chorus_collection', storedCollection)

            const currentCollection = this.get<Collection>(COLLECTION_KEY)
            if (currentCollection) {
                const mergedCollection = { ...currentCollection, ...storedCollection }
                this.cache.set(COLLECTION_KEY, mergedCollection)
            } else {
                this.cache.set(COLLECTION_KEY, storedCollection)
            }
        }
    }

    async populateFromExtensionStorage(data: Record<string, SimpleTrack>) {
        const userCollection = (await storage.getItem<Collection>('local:chorus_collection')) ?? {}
        const mergedCollection = { ...userCollection, ...data }
        await storage.setItem<Collection>('local:chorus_collection', mergedCollection)
    }

    async saveToExtensionStorage(track: SimpleTrack) {
        const userCollection = (await storage.getItem<Collection>('local:chorus_collection')) ?? {}
        if (userCollection) {
            userCollection[track.track_id] = track
            await storage.setItem('local:chorus_collection', userCollection)
        }
    }

    async removeFromExtensionStorage(track_id: string) {
        const userCollection = (await storage.getItem<Collection>('local:chorus_collection')) ?? {}
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

        if (!track?.snip && !track?.blocked) {
            await this.removeFromExtensionStorage(track_id)
        } else {
            if (Object.keys(track).includes('liked')) {
                delete track.liked
            }
            await this.saveToExtensionStorage(track)
        }
    }

    async generateSimpleTrack(track: Partial<NowPlaying>) {
        const fullTrack = {
            song_id: track.id!,
            liked: this.checkInUserCollection(track.track_id!) ?? false,
            track_id: track.track_id
        } as SimpleTrack
        await this.updateTrack({ track_id: fullTrack.track_id!, value: fullTrack })
    }

    checkInUserCollection(track_id: string) {
        if (!track_id) return null

        const userCollection = this.get<UserCollection>(USER_COLLECTION_KEY) ?? {}
        this.removeUndefinedUserTracks(userCollection)

        if (userCollection.hasOwnProperty(track_id)) return userCollection[track_id]

        return null
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
