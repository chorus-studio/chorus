<script lang="ts">
    import { onMount } from 'svelte'
    import { groupBy } from '$lib/utils/groupings'
    import { formatDate } from '$lib/utils/time'
    import AvatarLogo from '$lib/components/AvatarLogo.svelte'
    import { getNewReleasesService, type TrackMetadata } from '$lib/api/services/new-releases'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    let releases = $state<Record<string, TrackMetadata[]>>({})
    let isLoading = $state(true)

    async function getArtlistList() {
        try {
            const response = await getNewReleasesService().getMusicReleases()
            if (response.length) releases = groupBy(response, 'time')
        } finally {
            isLoading = false
        }
    }

    function pluralize(count: number, word: string) {
        return `${count} ${word}${count === 1 ? '' : 's'}`
    }

    function parseUri(uri: string) {
        const [type, id] = uri.split(':').slice(-2)
        return `${location.origin}/${type}/${id}`
    }

    onMount(getArtlistList)
</script>

<div
    class="max-w-screen-3xl container relative flex h-full w-full flex-col items-center justify-center gap-y-8 p-10"
    id="chorus-new-releases-view"
>
    <h1 class="absolute left-10 top-10 w-full text-left text-3xl font-bold">New Releases</h1>
    <div class="flex w-full flex-col gap-8">
        {#if isLoading}
            {#each Array(3) as _, i}
                <div class="flex flex-col gap-4">
                    <div class="h-8 w-48 animate-pulse rounded bg-muted"></div>
                    <div class="grid grid-cols-[repeat(auto-fill,300px)] gap-4">
                        {#each Array(10) as _, j}
                            <div class="hover:bg-secondary-muted relative flex w-full gap-2">
                                <div class="size-16 animate-pulse rounded-none bg-muted"></div>
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
            {#each Object.entries(releases) as [key, tracks]}
                <div class="flex flex-col gap-4">
                    <h1 class="w-full text-left text-2xl font-bold">{formatDate(key)}</h1>
                    <div class="grid grid-cols-[repeat(auto-fill,300px)] gap-4">
                        {#each tracks as track}
                            <div class="hover:bg-secondary-muted relative flex w-full gap-2">
                                <AvatarLogo src={track.imageUrl} class="size-16 rounded-none" />
                                <div class="flex h-16 w-full flex-col overflow-hidden">
                                    <ScrollingText
                                        text={track.title}
                                        className="!text-sm leading-none"
                                    >
                                        <a href={parseUri(track.uri)}>{track.title}</a>
                                    </ScrollingText>
                                    <ScrollingText
                                        text={track.artist.name}
                                        className="!text-sm leading-none"
                                    >
                                        <a href={parseUri(track.artist.uri)}>
                                            {track.artist.name}
                                        </a>
                                    </ScrollingText>
                                    <ScrollingText
                                        text={`${track.type} | ${pluralize(track.trackCount, 'track')}`}
                                        className="!text-sm leading-none"
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
