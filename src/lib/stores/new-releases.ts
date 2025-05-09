import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

import { groupBy } from '$lib/utils/groupings'
import { TrackMetadata } from '$lib/api/services/new-releases'
import { getNewReleasesService } from '$lib/api/services/new-releases'

export type Filter = {
    compilations: boolean
    singles: boolean
    albums: boolean
}
export type GroupBy = 'artist' | 'date' | 'type'
export type Range = 'yesterday' | 'week' | 'month' | 'since_last_update'

export type NewReleases = {
    range: Range
    count: number
    filters: Filter
    loading: boolean
    updated_at: string
    group_by: GroupBy
    library: string[]
    dismissed: string[]
    data: TrackMetadata[]
    release_id: string | null
    releases?: Record<string, TrackMetadata[]>
}

export const defaultFilters: Filter = {
    albums: true,
    singles: true,
    compilations: true
}

const defaultNewReleases: NewReleases = {
    data: [],
    count: 0,
    range: 'week',
    releases: {},
    loading: true,
    library: [],
    dismissed: [],
    group_by: 'type',
    release_id: null,
    filters: defaultFilters,
    updated_at: new Date().toISOString()
}

export const NEW_RELEASES_STORE_KEY = 'local:chorus_new_releases'

function createNewReleasesStore() {
    const store = writable<NewReleases>(defaultNewReleases)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    const groupByMap = {
        date: 'time',
        type: 'type',
        artist: 'artist.name'
    }

    function sortReleases(tracks: TrackMetadata[], group: GroupBy) {
        return tracks.sort((a, b) => {
            if (group === 'date') {
                return b.time - a.time
            }
            if (group === 'type') {
                return a.type.localeCompare(b.type)
            }
            return a.artist.name.localeCompare(b.artist.name, undefined, { sensitivity: 'base' })
        })
    }

    async function getNewReleases(force = false) {
        let { data, releases, group_by } = get(store)
        if (!force && data.length) {
            set({ ...get(store), loading: false })
            return
        }

        let count = 0
        set({ ...get(store), loading: true })
        try {
            const response = await getNewReleasesService().getMusicReleases()
            if (response.length) {
                const grouping = groupByMap[group_by]
                data = response
                releases = groupBy(sortReleases(data, group_by), grouping)
                count = response.length
            }
        } finally {
            await updateState({
                data,
                releases,
                count,
                loading: false,
                updated_at: new Date().toISOString()
            })
        }
    }

    async function undoDismiss() {
        const { dismissed, group_by, data, releases: currentReleases = {} } = get(store)
        if (dismissed.length === 0) return

        const uri = dismissed.pop()
        if (!uri) return

        const track = data.find((item) => item.uri === uri)
        if (!track) return

        const groupKey = groupByMap[group_by]
        const objectKey =
            groupKey == 'artist.name' ? track.artist.name : track[groupKey as keyof TrackMetadata]
        currentReleases[objectKey as string].push(track)
        currentReleases[objectKey as string] = sortReleases(
            currentReleases[objectKey as string],
            group_by
        )

        await updateState({
            dismissed,
            releases: currentReleases,
            count: Object.values(currentReleases).flat().length
        })
    }

    async function dismissRelease({ uri, key }: { uri: string; key: string }) {
        const { dismissed, releases: currentReleases = {} } = get(store)
        const index = currentReleases[key].findIndex((track) => track.uri === uri)
        if (index === -1) return
        currentReleases[key].splice(index, 1)
        if (currentReleases[key].length === 0) {
            delete currentReleases[key]
        }

        await updateState({
            dismissed: [...new Set([...dismissed, uri])],
            releases: currentReleases,
            count: Object.values(currentReleases).flat().length
        })
    }

    async function updateGroupBy(group_by: GroupBy) {
        const { releases: currentReleases = {} } = get(store)
        const tracks = Object.values(currentReleases).flat()
        const groupedTracks = groupBy(sortReleases(tracks, group_by), groupByMap[group_by])

        await updateState({ group_by, releases: groupedTracks })
    }

    async function updateState(state: Partial<NewReleases>) {
        const currentState = get(store)
        const updatedState = { ...currentState, ...state }
        set(updatedState)
        isUpdatingStorage = true

        try {
            await storage.setItem<NewReleases>(NEW_RELEASES_STORE_KEY, updatedState)
        } catch (error) {
            console.error('Error updating new releases in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function reset() {
        set(defaultNewReleases)
        await getNewReleases(true)
    }

    function search(search: string) {
        const { data, group_by } = get(store)
        const filteredData = data.filter((item) => {
            return (
                item.artist.name.toLowerCase().match(new RegExp(search.toLowerCase(), 'i')) ||
                item.title.toLowerCase().match(new RegExp(search.toLowerCase(), 'i'))
            )
        })
        const releases = groupBy(sortReleases(filteredData, group_by), groupByMap[group_by])
        update((state) => ({ ...state, releases }))
    }

    function resetSearch() {
        const { data, group_by } = get(store)
        const releases = groupBy(sortReleases(data, group_by), groupByMap[group_by])
        update((state) => ({ ...state, releases }))
    }

    async function updateLibrary(uri: string) {
        const { library } = get(store)
        const remove = library.includes(uri)
        await getNewReleasesService().updateLibrary({ uri, remove })
        await updateState({
            library: remove ? library.filter((item) => item !== uri) : [...library, uri]
        })
    }

    storage
        .getItem<NewReleases>(NEW_RELEASES_STORE_KEY, {
            fallback: defaultNewReleases
        })
        .then((newValues) => {
            if (!newValues) {
                update((state) => ({ ...state, loading: false }))
                return
            }

            // Sync the stored playback settings with the current type definition
            const syncedValues = syncWithType(newValues, defaultNewReleases)
            // Preserve the releases if they exist in storage
            const data = newValues.data ?? []
            const releases = newValues.releases ?? {}
            set({ ...syncedValues, data, releases, loading: false })

            // Update storage with synced values
            isUpdatingStorage = true
            storage
                .setItem<NewReleases>(NEW_RELEASES_STORE_KEY, { ...syncedValues, releases })
                .then(() => {
                    isUpdatingStorage = false
                })
                .catch((error) => {
                    console.error('Error updating storage:', error)
                    isUpdatingStorage = false
                })
        })

    storage.watch<NewReleases>(NEW_RELEASES_STORE_KEY, (newValues) => {
        if (!newValues || isUpdatingStorage) return

        const syncedValues = syncWithType(newValues, defaultNewReleases)
        set(syncedValues)
    })

    return {
        reset,
        search,
        subscribe,
        updateState,
        undoDismiss,
        resetSearch,
        updateLibrary,
        updateGroupBy,
        dismissRelease,
        getNewReleases
    }
}

export const newReleasesStore = createNewReleasesStore()

export const newReleasesUIStore = (() => {
    const { subscribe, set, update } = writable(false)

    return {
        subscribe,
        toggle: () => update((value) => !value),
        set: (value: boolean) => set(value)
    }
})()
