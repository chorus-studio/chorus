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
export type ReleaseType = 'music' | 'shows&podcasts' | 'all'
export type ReleaseFilter = { created_at: string; uri: string }

export type NewReleases = {
    range: Range
    filters: Filter
    loading: boolean
    group_by: GroupBy
    music_count: number
    shows_count: number
    release_type: ReleaseType
    library: ReleaseFilter[]
    dismissed: ReleaseFilter[]
    music_data: TrackMetadata[]
    shows_data: TrackMetadata[]
    music_updated_at: string
    shows_updated_at: string
    release_id: string | null
    music_releases?: Record<string, TrackMetadata[]>
    shows_releases?: Record<string, TrackMetadata[]>
}

export const defaultFilters: Filter = {
    albums: true,
    singles: true,
    compilations: true
}

const defaultNewReleases: NewReleases = {
    library: [],
    loading: true,
    music_data: [],
    shows_data: [],
    music_count: 0,
    shows_count: 0,
    range: 'week',
    dismissed: [],
    group_by: 'type',
    release_id: null,
    music_releases: {},
    shows_releases: {},
    release_type: 'music',
    filters: defaultFilters,
    music_updated_at: new Date().toISOString(),
    shows_updated_at: new Date().toISOString()
}

export const NEW_RELEASES_STORE_KEY = 'local:chorus_new_releases'

export const groupByMap = {
    date: 'time',
    type: 'type',
    artist: 'artist.name'
}

export function sortReleases(tracks: TrackMetadata[], group: GroupBy) {
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

function createNewReleasesStore() {
    const store = writable<NewReleases>(defaultNewReleases)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    async function getShowsReleases(force = false) {
        let { shows_data, shows_releases, group_by, dismissed, release_type } = get(store)
        if (!force && shows_data.length) {
            set({ ...get(store), loading: false })
            return
        }

        let shows_count = 0
        set({ ...get(store), loading: true })

        try {
            const response = await getNewReleasesService().getShowsReleases()
            if (response.length) {
                const grouping = groupByMap[group_by]
                shows_data = response.filter(
                    (item) => !dismissed.find((filter) => filter.uri === item.uri)
                )
                shows_releases = groupBy(sortReleases(shows_data, group_by), grouping)
                shows_count = shows_data.length
            }
        } finally {
            await updateState({
                shows_data,
                shows_releases,
                shows_count,
                loading: false,
                shows_updated_at: new Date().toISOString(),
                ...(release_type !== 'all' && { music_count: 0 })
            })
        }
    }

    async function getMusicReleases(force = false) {
        let { music_data, music_releases, group_by, dismissed, release_type } = get(store)
        if (!force && music_data.length) {
            set({ ...get(store), loading: false })
            return
        }

        let music_count = 0
        set({ ...get(store), loading: true })
        try {
            const response = await getNewReleasesService().getMusicReleases()
            if (response.length) {
                const grouping = groupByMap[group_by]
                music_data = response.filter(
                    (item) => !dismissed.find((filter) => filter.uri === item.uri)
                )
                music_releases = groupBy(sortReleases(music_data, group_by), grouping)
                music_count = music_data.length
            }
        } finally {
            await updateState({
                music_data,
                music_releases,
                music_count,
                loading: false,
                music_updated_at: new Date().toISOString(),
                ...(release_type !== 'all' && { shows_count: 0 })
            })
        }
    }

    async function undoDismiss() {
        const {
            dismissed,
            group_by,
            music_data,
            shows_data,
            music_releases: musicReleases = {},
            shows_releases: showsReleases = {}
        } = get(store)
        if (dismissed.length === 0) return

        const filter = dismissed.pop()
        if (!filter) return

        const type = filter.uri.includes('episode') ? 'shows' : 'music'
        const data = type === 'shows' ? shows_data : music_data
        const track = data.find((item) => item.uri === filter.uri)
        if (!track) return

        const releases = type === 'shows' ? showsReleases : musicReleases
        const groupKey = groupByMap[group_by]
        const objectKey =
            groupKey == 'artist.name' ? track.artist.name : track[groupKey as keyof TrackMetadata]

        const newKey = !releases[objectKey as string]?.length
        if (newKey) releases[objectKey as string] = []
        releases[objectKey as string].push(track)
        releases[objectKey as string] = sortReleases(releases[objectKey as string], group_by)

        const sortedReleases = groupBy(
            sortReleases(Object.values(releases).flat(), group_by),
            groupByMap[group_by]
        )

        const stateCountKey = type === 'shows' ? 'shows_count' : 'music_count'
        const stateReleasesKey = type === 'shows' ? 'shows_releases' : 'music_releases'

        await updateState({
            dismissed,
            [stateReleasesKey]: sortedReleases,
            [stateCountKey]: Object.values(sortedReleases).flat().length
        })
    }

    function clearOldFilters(arr: ReleaseFilter[]) {
        const now = new Date()
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        return arr.filter((item) => {
            const filterDate = new Date(item.created_at)
            return filterDate > oneMonthAgo
        })
    }

    async function dismissRelease({ uri, key }: { uri: string; key: string }) {
        const {
            dismissed,
            shows_releases: showsReleases = {},
            music_releases: musicReleases = {}
        } = get(store)
        const type = uri.includes('episode') ? 'shows' : 'music'
        const currentReleases = type === 'shows' ? showsReleases : musicReleases
        const index = currentReleases[key].findIndex((track) => track.uri === uri)
        if (index === -1) return

        currentReleases[key].splice(index, 1)
        if (currentReleases[key].length === 0) delete currentReleases[key]

        const mostRecentDismissed = clearOldFilters([
            ...new Set([...dismissed, { uri, created_at: new Date().toISOString() }])
        ])

        const stateKey = type === 'shows' ? 'shows_releases' : 'music_releases'
        const stateCountKey = type === 'shows' ? 'shows_count' : 'music_count'

        await updateState({
            [stateKey]: currentReleases,
            dismissed: mostRecentDismissed,
            [stateCountKey]: Object.values(currentReleases).flat().length
        })
    }

    async function updateGroupBy(group_by: GroupBy) {
        const { shows_releases: showsReleases = {}, music_releases: musicReleases = {} } =
            get(store)
        const tracks = Object.values(musicReleases).flat()
        const shows = Object.values(showsReleases).flat()

        const groupedMusic = groupBy(sortReleases(tracks, group_by), groupByMap[group_by])
        const groupedShows = groupBy(sortReleases(shows, group_by), groupByMap[group_by])

        await updateState({
            group_by,
            music_releases: groupedMusic,
            shows_releases: groupedShows
        })
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
        await getMusicReleases(true)
    }

    function search(search: string) {
        const { shows_data, music_data, group_by } = get(store)
        const filterData = (arr: TrackMetadata[]) =>
            arr.filter((item) => {
                return (
                    item.artist.name.toLowerCase().match(new RegExp(search.toLowerCase(), 'i')) ||
                    item.title.toLowerCase().match(new RegExp(search.toLowerCase(), 'i'))
                )
            })

        const music_releases = groupBy(
            sortReleases(filterData(music_data), group_by),
            groupByMap[group_by]
        )
        const shows_releases = groupBy(
            sortReleases(filterData(shows_data), group_by),
            groupByMap[group_by]
        )
        update((state) => ({ ...state, music_releases, shows_releases }))
    }

    function resetSearch() {
        const { shows_data, dismissed, music_data, group_by } = get(store)
        const music_releases = groupBy(
            sortReleases(
                music_data.filter((item) => !dismissed.find((data) => data.uri == item.uri)),
                group_by
            ),
            groupByMap[group_by]
        )
        const shows_releases = groupBy(
            sortReleases(
                shows_data.filter((item) => !dismissed.find((data) => data.uri == item.uri)),
                group_by
            ),
            groupByMap[group_by]
        )
        update((state) => ({ ...state, music_releases, shows_releases }))
    }

    async function updateLibrary(uri: string) {
        const { library } = get(store)
        const remove = !!library.find((item) => item.uri === uri)
        await getNewReleasesService().updateLibrary({ uri, remove })
        const filteredLibrary = clearOldFilters(
            remove
                ? library.filter((item) => item.uri !== uri)
                : [...library, { uri, created_at: new Date().toISOString() }]
        )
        await updateState({
            library: filteredLibrary
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
            const music_data = newValues.music_data ?? []
            const music_releases = newValues.music_releases ?? {}
            const shows_data = newValues.shows_data ?? []
            const shows_releases = newValues.shows_releases ?? {}
            set({
                ...syncedValues,
                music_data,
                music_releases,
                shows_data,
                shows_releases,
                loading: false
            })

            // Update storage with synced values
            isUpdatingStorage = true
            storage
                .setItem<NewReleases>(NEW_RELEASES_STORE_KEY, {
                    ...syncedValues,
                    music_data,
                    music_releases,
                    shows_data,
                    shows_releases
                })
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
        getShowsReleases,
        getMusicReleases
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
