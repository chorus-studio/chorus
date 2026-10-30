import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { getNewReleasesService } from '$lib/api/services/new-releases'
import {
    defaultReleasesState,
    isStale,
    migrateReleasesState,
    pruneStamped,
    scopeCounts,
    stamp,
    type Filter,
    type GroupBy,
    type Range,
    type ReleasesState,
    type Scope
} from '$lib/utils/releases'

export type { Filter, GroupBy, Range, Release, ReleasesState, Scope } from '$lib/utils/releases'

export const NEW_RELEASES_STORE_KEY = 'local:chorus_new_releases'

/** The sync in progress and whether the last one failed; for the dialog, not persisted. */
export const releasesUI = writable<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null
})

/**
 * New releases from the artists and shows the person follows: the lists as
 * last synced (a month's worth; the range and kind filters cut them client-
 * side), the dialog's settings, dismissals and saves, and the counts the
 * toolbar badge reads. Shared through storage with the background, which
 * paints the badge from `music_count + shows_count - seen_count`.
 */
function createNewReleasesStore() {
    const store = writable<ReleasesState>(defaultReleasesState)
    let isUpdatingStorage = false
    let inflight: Promise<void> | null = null

    const recounted = (state: ReleasesState): ReleasesState => ({ ...state, ...scopeCounts(state) })

    async function persist(state: ReleasesState) {
        store.set(state)
        isUpdatingStorage = true
        try {
            await storage.setItem<ReleasesState>(NEW_RELEASES_STORE_KEY, state)
        } catch (error) {
            console.error('Error saving new releases:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    const updateState = (patch: Partial<ReleasesState>) =>
        persist(recounted({ ...get(store), ...patch }))

    /** Sync the scope's lists when missing or stale, or always when forced; one sync at a time. */
    function refresh(force = false): Promise<void> {
        if (inflight) return inflight
        inflight = sync(force).finally(() => {
            inflight = null
        })
        return inflight
    }

    async function sync(force: boolean) {
        const { scope, music_updated_at, shows_updated_at } = get(store)
        const now = Date.now()
        const wantMusic = scope !== 'podcasts' && (force || isStale(music_updated_at, now))
        const wantShows = scope !== 'music' && (force || isStale(shows_updated_at, now))
        if (!wantMusic && !wantShows) return

        releasesUI.set({ loading: true, error: null })
        let error: string | null = null
        try {
            const service = getNewReleasesService()
            const [music, shows] = await Promise.allSettled([
                wantMusic ? service.getMusicReleases() : Promise.resolve(null),
                wantShows ? service.getShowsReleases() : Promise.resolve(null)
            ])
            const at = new Date().toISOString()
            const current = get(store)
            const patch: Partial<ReleasesState> = {
                dismissed: pruneStamped(current.dismissed),
                library: pruneStamped(current.library)
            }
            if (music.status === 'fulfilled' && music.value) {
                patch.music = music.value
                patch.music_updated_at = at
            }
            if (shows.status === 'fulfilled' && shows.value) {
                patch.shows = shows.value
                patch.shows_updated_at = at
            }
            const failed = [music, shows].filter(
                (result): result is PromiseRejectedResult => result.status === 'rejected'
            )
            failed.forEach((result) => console.error('[chorus] new releases sync:', result.reason))
            await updateState(patch)
            // One list failing leaves it stale for the next open; both failing is an error to show.
            const asked = Number(wantMusic) + Number(wantShows)
            if (failed.length === asked) error = 'Could not reach Spotify'
        } catch (caught) {
            console.error('[chorus] new releases sync:', caught)
            error = 'Could not reach Spotify'
        } finally {
            releasesUI.set({ loading: false, error })
        }
    }

    async function setScope(scope: Scope) {
        await updateState({ scope })
        // The scope's list may never have been fetched.
        void refresh()
    }

    const setRange = (range: Range) => updateState({ range })
    const setGroupBy = (group_by: GroupBy) => updateState({ group_by })
    const setFilter = (key: keyof Filter, on: boolean) =>
        updateState({ filters: { ...get(store).filters, [key]: on } })

    /** Hide a release for the sync window; it is not removed from Spotify. */
    const dismiss = (uri: string) =>
        updateState({
            dismissed: pruneStamped([
                ...get(store).dismissed.filter((entry) => entry.uri !== uri),
                stamp(uri)
            ])
        })
    const undismiss = (uri: string) =>
        updateState({ dismissed: get(store).dismissed.filter((entry) => entry.uri !== uri) })
    const restoreDismissed = () => updateState({ dismissed: [] })

    const isSaved = (uri: string) => get(store).library.some((entry) => entry.uri === uri)

    /** Add the release to Your Library, or take it out again; resolves to whether it is saved now. */
    async function toggleLibrary(uri: string): Promise<boolean> {
        const remove = isSaved(uri)
        await getNewReleasesService().updateLibrary({ uri, remove })
        const rest = get(store).library.filter((entry) => entry.uri !== uri)
        await updateState({ library: pruneStamped(remove ? rest : [...rest, stamp(uri)]) })
        return !remove
    }

    /** The dialog is open: everything in view counts as seen, so the toolbar badge clears. */
    async function markSeen() {
        const { music_count, shows_count, seen_count } = get(store)
        const total = music_count + shows_count
        if (seen_count !== total) await updateState({ seen_count: total })
    }

    storage.getItem<unknown>(NEW_RELEASES_STORE_KEY).then((saved) => {
        if (!saved) return
        const migrated = migrateReleasesState(saved)
        const counted = recounted(migrated)
        store.set(counted)
        // Counts drift as days roll over, and an old shape needs writing back
        // once, so the background's badge reads the same numbers.
        const legacy = typeof saved === 'object' && !('scope' in (saved as object))
        if (
            legacy ||
            counted.music_count !== migrated.music_count ||
            counted.shows_count !== migrated.shows_count
        ) {
            void persist(counted)
        }
    })

    storage.watch<unknown>(NEW_RELEASES_STORE_KEY, (saved) => {
        if (isUpdatingStorage) return
        store.set(saved ? migrateReleasesState(saved) : defaultReleasesState)
    })

    return {
        subscribe: store.subscribe,
        updateState,
        refresh,
        setScope,
        setRange,
        setGroupBy,
        setFilter,
        dismiss,
        undismiss,
        restoreDismissed,
        toggleLibrary,
        isSaved,
        markSeen
    }
}

export const newReleasesStore = createNewReleasesStore()
