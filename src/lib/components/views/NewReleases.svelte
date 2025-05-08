<script lang="ts">
    import { onMount } from 'svelte'
    import { formatDate } from '$lib/utils/time'
    import { mediaStore } from '$lib/stores/media'
    import { registerQueueService } from '$lib/api/services/queue'
    import { newReleasesStore, newReleasesUIStore } from '$lib/stores/new-releases'

    import X from '@lucide/svelte/icons/x'
    import { Button } from '$lib/components/ui/button'
    import AvatarLogo from '$lib/components/AvatarLogo.svelte'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    async function getArtistReleases() {
        if ($newReleasesStore.data.length) return

        try {
            await newReleasesStore.getNewReleases()
        } catch (error) {
            console.error('Error fetching new releases:', error)
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

        const queueService = registerQueueService()
        try {
            await queueService.playRelease(uri)
            await newReleasesStore.updateState({ release_id: uri })
        } catch (error) {
            console.error('Error playing track:', error)
        }
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
    }

    $: isLoading = $newReleasesStore.loading || !$newReleasesStore.data.length

    function pluralize(count: number, word: string) {
        return `${count} ${word}${count === 1 ? '' : 's'}`
    }

    function parseUri(uri: string) {
        const [type, id] = uri.split(':').slice(-2)
        return `/${type}/${id}`
    }

    function goTo(uri: string) {
        const path = parseUri(uri)
        newReleasesUIStore.set(false)
        window.postMessage({ type: 'FROM_NEW_RELEASES', data: path }, '*')
    }

    function getPath(path: string) {
        return {
            play: '<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"/>',
            pause: '<path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"/>',
            'save/unsave':
                '<path d="M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z"/>'
        }[path]
    }

    onMount(() => {
        getArtistReleases()
        return () => {
            newReleasesStore.updateState({ release_id: null })
        }
    })
</script>

<div class="flex h-full w-full" id="chorus-new-releases-view">
    <div class="mt-28 flex h-full w-full flex-col items-center justify-center bg-[#121212]">
        <div class="mx-auto flex w-full max-w-screen-4xl flex-col gap-8 p-10 px-10 py-6">
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
            {:else}
                {#each Object.entries($newReleasesStore.releases ?? {}) as [key, tracks]}
                    <div class="md:flex-row flex w-full flex-col justify-center gap-4">
                        <h1 class="md:min-w-28 w-full text-left text-2xl font-bold">
                            {formatDate(key)}
                        </h1>
                        <div class="grid w-full grid-cols-[repeat(auto-fill,320px)] gap-4 gap-y-6">
                            {#each tracks as track}
                                <div class="relative flex h-16 w-full gap-2">
                                    <div
                                        class="flex h-16 w-6 cursor-pointer flex-col items-center justify-evenly border border-white"
                                    >
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onclick={() => playTrack(track.uri)}
                                            class="bg:transparent flex size-5 items-center justify-center rounded-full [&_svg]:size-5"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="-4 -4 24 24"
                                                class="size-5 fill-white stroke-1 brightness-100"
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
                                            class="bg:transparent flex size-5 items-center justify-center rounded-full [&_svg]:size-5"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="-3 -5 24 24"
                                                class="size-5 fill-white stroke-2 brightness-100"
                                            >
                                                {@html getPath('save/unsave')}
                                            </svg>
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
                                            class="bg:transparent flex size-5 items-center justify-center rounded-full [&_svg]:size-5"
                                        >
                                            <X class="size-5 fill-white stroke-2 brightness-100" />
                                        </Button>
                                    </div>
                                    <AvatarLogo src={track.imageUrl} class="size-16 rounded-none" />
                                    <div class="flex h-16 w-full flex-col overflow-scroll">
                                        <ScrollingText
                                            as="a"
                                            text={track.title}
                                            className="text-base chorus-release-text leading-none cursor-pointer text-muted-foreground  hover:underline"
                                            handleClick={() => goTo(track.uri)}
                                        />
                                        <ScrollingText
                                            as="a"
                                            text={track.artist.name}
                                            className="text-base chorus-release-text leading-none cursor-pointer text-muted-foreground hover:underline"
                                            handleClick={() => goTo(track.artist.uri)}
                                        />
                                        <ScrollingText
                                            text={`${track.type} | ${pluralize(track.trackCount, 'track')}`}
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
</div>
