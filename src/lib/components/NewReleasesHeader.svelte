<script lang="ts">
    import { onDestroy } from 'svelte'
    import { toast } from 'svelte-sonner'
    import { newReleasesStore, newReleasesUIStore } from '$lib/stores/new-releases'

    import X from '@lucide/svelte/icons/x'
    import Undo from '@lucide/svelte/icons/undo'
    import Tippy from '$lib/components/Tippy.svelte'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import RefreshCw from '@lucide/svelte/icons/refresh-cw'
    import NewReleasesDialog from '$lib/components/NewReleasesDialog.svelte'

    let search = $state('')
    let debounceTimer: ReturnType<typeof setTimeout>

    function debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        return (...args: Parameters<T>) => {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => func(...args), wait)
        }
    }

    const debouncedSearch = debounce((searchTerm: string) => {
        newReleasesStore.search(searchTerm.trim())
    }, 300)

    async function refresh() {
        try {
            newReleasesUIStore.setLoading(true)
            await newReleasesStore.refreshAllReleases(true)
        } catch (error) {
            console.error('Error refreshing releases:', error)
            toast.error('Error refreshing releases')
        } finally {
            toast.success('Refreshed releases')
            newReleasesUIStore.setLoading(false)
        }
    }

    async function undoDismiss() {
        await newReleasesStore.undoDismiss()
    }

    function handleSearch(event: Event) {
        const input = event.target as HTMLInputElement
        search = input.value
        debouncedSearch(search)
    }

    function resetSearch() {
        search = ''
        newReleasesStore.resetSearch()
    }

    const disabled = $derived($newReleasesStore.dismissed.length == 0)

    onDestroy(() => {
        if (search.trim() !== '') newReleasesStore.resetSearch()
        clearTimeout(debounceTimer)
    })
</script>

<div
    id="chorus-new-releases-header"
    class="xl:container absolute left-1/2 z-[99999] flex w-full -translate-x-1/2 rounded-t-md bg-[#121212]"
>
    <div class="mx-auto flex w-full max-w-screen-4xl justify-between gap-4 px-10 py-6">
        <div class="flex flex-col gap-2">
            <h1 class="text-left text-4xl font-bold">New Releases</h1>
            <p class="text-lg text-muted-foreground">
                The latest releases from artists, podcasts, and shows you follow.
            </p>
        </div>

        <div class="relative flex h-9 items-center justify-end gap-2">
            <div class="relative flex items-center">
                <Input
                    class="mr-6 h-9 w-96"
                    placeholder="search"
                    bind:value={search}
                    oninput={handleSearch}
                />

                <Button
                    size="icon"
                    variant="ghost"
                    onclick={resetSearch}
                    class="bg:transparent absolute right-8 z-50 flex size-5 items-center justify-center rounded-full [&_svg]:size-5"
                >
                    <X class="size-5 fill-white stroke-2 brightness-100" />
                </Button>
            </div>
            {#if $newReleasesStore.dismissed.length > 0}
                <Tippy {disabled} text="undo dismiss" onTrigger={undoDismiss} side="bottom">
                    <Undo />
                </Tippy>
            {/if}
            <div class="relative flex items-center gap-2">
                <Tippy text="resync" onTrigger={refresh} side="bottom" class="relative">
                    <RefreshCw />
                </Tippy>
                <NewReleasesDialog />
            </div>
        </div>
    </div>
</div>
