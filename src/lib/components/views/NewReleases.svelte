<script lang="ts">
    import { onMount } from 'svelte'
    import { formatDate } from '$lib/utils/time'
    import { mediaStore } from '$lib/stores/media'
    import { groupBy } from '$lib/utils/groupings'
    import { getQueueService } from '$lib/api/services/queue'
    import type { TrackMetadata } from '$lib/api/services/new-releases'
    import {
        groupByMap,
        sortReleases,
        newReleasesStore,
        newReleasesUIStore
    } from '$lib/stores/new-releases'

    import X from '@lucide/svelte/icons/x'
    import { Button } from '$lib/components/ui/button'
    import AvatarLogo from '$lib/components/AvatarLogo.svelte'
    import CirclePlus from '@lucide/svelte/icons/circle-plus'
    import CircleCheck from '@lucide/svelte/icons/circle-check'
    import ScrollingText from '$lib/components/ScrollingText.svelte'
    import { ScrollArea } from '$lib/components/ui/scroll-area'

    let releases: Record<string, TrackMetadata[]> = $state({})

    async function getReleases() {
        const type = $newReleasesStore.release_type
        if (type === 'music' && $newReleasesStore.music_data.length) return
        if (type === 'shows&podcasts' && $newReleasesStore.shows_data.length) return
        if (
            (type === 'all' && $newReleasesStore.music_data.length) ||
            $newReleasesStore.shows_data.length
        )
            return

        try {
            newReleasesUIStore.setLoading(true)
            await newReleasesStore.refreshAllReleases()
        } catch (error) {
            console.error('Error fetching music releases:', error)
        } finally {
            newReleasesUIStore.setLoading(false)
        }
    }

    function pauseTrack() {
        const playButton = document.querySelector(
            'button[data-testid="control-button-playpause"]'
        ) as HTMLButtonElement
        playButton?.click()
    }

    async function playTrack(uri: string) {
        if ($newReleasesStore.release_id === uri) return pauseTrack()

        try {
            await getQueueService().playRelease(uri)
            await newReleasesStore.updateState({ release_id: uri })
        } catch (error) {
            console.error('Error playing track:', error)
        }
    }

    async function updateLibrary(uri: string) {
        await newReleasesStore.updateLibrary(uri)
    }

    async function dismissRelease({
        event,
        uri,
        key
    }: {
        event: MouseEvent
        uri: string
        key: string
    }) {
        event.stopPropagation()
        await newReleasesStore.dismissRelease({ uri, key })

        releases =
            ($newReleasesStore.release_type === 'music'
                ? $newReleasesStore.music_releases
                : $newReleasesStore.release_type === 'shows&podcasts'
                  ? $newReleasesStore.shows_releases
                  : groupReleases()) ?? {}
    }

    function updatedAtSet() {
        const { music_updated_at, shows_updated_at, release_type, music_data, shows_data } = $newReleasesStore
        if (release_type === 'music') return music_updated_at || music_data.length > 0
        if (release_type === 'shows&podcasts') return shows_updated_at || shows_data.length > 0
        return (music_updated_at && shows_updated_at) || (music_data.length > 0 && shows_data.length > 0)
    }

    const isLoading = $derived($newReleasesUIStore.loading || !updatedAtSet())

    function pluralize(count: number, word: string) {
        return `${count} ${word}${count === 1 ? '' : 's'}`
    }

    function parseUri(uri: string) {
        const [type, id] = uri.split(':').slice(-2)
        return `/${type}/${id}`
    }

    function goTo(uri: string) {
        const path = parseUri(uri)
        newReleasesUIStore.setVisible(false)
        window.postMessage({ type: 'FROM_NEW_RELEASES', data: path }, '*')
    }

    function getPath(path: string) {
        return {
            play: '<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"/>',
            pause: '<path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"/>'
        }[path]
    }

    function groupReleases() {
        const { music_releases, shows_releases, group_by } = $newReleasesStore
        const grouping = groupByMap[group_by]
        const music = Object.values(music_releases ?? {}).flat()
        const shows = Object.values(shows_releases ?? {}).flat()
        return groupBy(sortReleases([...music, ...shows], group_by), grouping)
    }

    releases =
        ($newReleasesStore.release_type === 'music'
            ? $newReleasesStore.music_releases
            : $newReleasesStore.release_type === 'shows&podcasts'
              ? $newReleasesStore.shows_releases
              : groupReleases()) ?? {}

    $effect(() => {
        releases =
            ($newReleasesStore.release_type === 'music'
                ? $newReleasesStore.music_releases
                : $newReleasesStore.release_type === 'shows&podcasts'
                  ? $newReleasesStore.shows_releases
                  : groupReleases()) ?? {}
    })

    onMount(() => {
        getReleases()

        return () => {
            newReleasesStore.updateState({ release_id: null })
        }
    })
</script>

<ScrollArea class="flex h-full w-full" id="chorus-new-releases-view">
    <div class="mt-28 flex h-full w-full flex-col items-center justify-center bg-[#121212]">
        <div
            class="xl:min-h-dvh mx-auto flex h-full w-full max-w-screen-4xl flex-col gap-8 p-10 px-10 py-6"
        >
            {#if isLoading}
                {#each Array(3) as _, i}
                    <div class="flex flex-col gap-4">
                        <div class="h-8 w-48 animate-pulse rounded bg-muted"></div>
                        <div class="grid grid-cols-[repeat(auto-fill,330px)] gap-4">
                            {#each Array(10) as _, j}
                                <div class="hover:bg-secondary-muted relative flex w-full gap-2">
                                    <div
                                        class="aspect-square size-16 animate-pulse rounded-none bg-muted"
                                    ></div>
                                    <div class="flex h-16 w-full flex-col gap-2">
                                        <div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
                                        <div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
                                        <div class="h-4 w-1/3 animate-pulse rounded bg-muted"></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/each}
            {:else if !Object.keys(releases).length}
                <div
                    class="xl:min-h-dvh xl:top-1/4 absolute left-1/2 top-0 flex h-full w-full -translate-x-1/2 flex-col items-center justify-center"
                >
                    <p class="text-center text-3xl text-muted-foreground">No releases found</p>
                    <p class="text-center text-3xl text-muted-foreground">
                        Update config to refetch with different filters
                    </p>
                </div>
            {:else}
                {#each Object.entries(releases ?? {}) as [key, tracks]}
                    <div class="md:flex-row flex w-full flex-col justify-center gap-4">
                        <h1 class="md:min-w-28 w-full text-left text-2xl font-bold">
                            {formatDate(key)}
                        </h1>
                        <div class="grid w-full grid-cols-[repeat(auto-fill,320px)] gap-4 gap-y-6">
                            {#each tracks as track}
                                <div class="relative flex h-16 w-full gap-2">
                                    <div
                                        class="flex h-16 w-6 cursor-pointer flex-col items-center justify-between border border-white"
                                    >
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onclick={() => playTrack(track.uri)}
                                            class="bg:transparent flex size-5 items-center justify-center rounded-full hover:bg-transparent [&_svg]:size-6"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="-4 -4 24 24"
                                                class="size-6 fill-current brightness-100 hover:fill-white"
                                            >
                                                {@html getPath(
                                                    $newReleasesStore.release_id === track.uri &&
                                                        $mediaStore.playing
                                                        ? 'pause'
                                                        : 'play'
                                                )}
                                            </svg>
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onclick={() => updateLibrary(track.uri)}
                                            class="bg:transparent flex size-5 items-center justify-center rounded-full hover:bg-transparent [&_svg]:size-4"
                                        >
                                            {#if $newReleasesStore.library.find((filter) => filter.uri === track.uri)}
                                                <CircleCheck class="size-4  stroke-green-500" />
                                            {:else}
                                                <CirclePlus
                                                    class="size-4 stroke-current hover:stroke-white hover:brightness-200"
                                                />
                                            {/if}
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onclick={async (event) =>
                                                await dismissRelease({
                                                    event,
                                                    uri: track.uri,
                                                    key
                                                })}
                                            class="bg:transparent flex size-5 items-center justify-center rounded-full hover:bg-transparent [&_svg]:size-[18px]"
                                        >
                                            <X
                                                class="size-[18px] stroke-current stroke-2 brightness-100 hover:stroke-white"
                                            />
                                        </Button>
                                    </div>
                                    <AvatarLogo src={track.imageUrl} class="size-16 rounded-none" />
                                    <div class="flex h-16 w-full flex-col overflow-scroll">
                                        <ScrollingText
                                            as="a"
                                            text={track.title}
                                            className="text-base chorus-release-text leading-none cursor-pointer text-muted-foreground hover:text-white hover:underline"
                                            handleClick={() => goTo(track.uri)}
                                        />
                                        <ScrollingText
                                            as="a"
                                            text={track.artist.name}
                                            className="text-base chorus-release-text leading-none cursor-pointer text-muted-foreground hover:text-white hover:underline"
                                            handleClick={() => goTo(track.artist.uri)}
                                        />
                                        <ScrollingText
                                            text={`${track.type}${
                                                track?.trackCount
                                                    ? ` | ${pluralize(track.trackCount, 'track')}`
                                                    : ''
                                            }`}
                                            className="!text-base chorus-release-text text-muted-foreground leading-none lowercase"
                                        />
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</ScrollArea>
