<script lang="ts">
    import { newReleasesStore } from '$lib/stores/new-releases'
    import type { GroupBy, Filter, Range, ReleaseType } from '$lib/stores/new-releases'

    import Tippy from '$lib/components/Tippy.svelte'
    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Separator } from '$lib/components/ui/separator'
    import Settings2 from '@lucide/svelte/icons/settings-2'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    async function selectRange(range: Range) {
        await newReleasesStore.updateState({ range })
        if ($newReleasesStore.release_type === 'music')
            await newReleasesStore.getMusicReleases(true)
    }

    async function selectFilter({ filter, checked }: { filter: keyof Filter; checked: boolean }) {
        await newReleasesStore.updateState({
            filters: {
                ...$newReleasesStore.filters,
                [filter]: checked
            }
        })
        if ($newReleasesStore.release_type === 'music')
            await newReleasesStore.getMusicReleases(true)
    }

    async function selectReleaseType(release_type: ReleaseType) {
        await newReleasesStore.updateState({ release_type })
        if (release_type === 'music') await newReleasesStore.getMusicReleases(true)
        else if (release_type === 'shows&podcasts') await newReleasesStore.getShowsReleases(true)
        else {
            await Promise.all([
                newReleasesStore.getMusicReleases(true),
                newReleasesStore.getShowsReleases(true)
            ])
        }
    }

    async function toggleGroupBy(group_by: GroupBy) {
        await newReleasesStore.updateGroupBy(group_by)
    }
</script>

<Dialog.Root>
    <Dialog.Trigger id="chorus-new-releases-dialog-trigger">
        <Tippy text="config" side="bottom">
            <Settings2 class="size-7" />
        </Tippy>
    </Dialog.Trigger>
    <Dialog.Content
        id="chorus-new-releases-dialog-content"
        class="rounded-md bg-primary-foreground"
    >
        <Dialog.Title>New Releases Settings</Dialog.Title>
        <Separator class="h-0.5 w-full" />
        <div class="flex flex-col gap-4">
            <div class="flex w-full gap-4">
                <p class="w-full text-sm font-medium">release types</p>
                <div class="flex w-full items-center justify-end">
                    <CustomSelect
                        options={[
                            { label: 'music', value: 'music' },
                            { label: 'shows&podcasts', value: 'shows&podcasts' },
                            { label: 'all', value: 'all' }
                        ]}
                        selected={$newReleasesStore.release_type}
                        onValueChange={(value: ReleaseType) => selectReleaseType(value)}
                    />
                </div>
            </div>

            <div class="flex w-full gap-4">
                <p class="w-full text-sm font-medium">date range</p>
                <div class="flex w-full items-center justify-end">
                    <CustomSelect
                        options={[
                            { label: 'yesterday', value: 'yesterday' },
                            { label: 'week', value: 'week' },
                            { label: 'month', value: 'month' }
                        ]}
                        selected={$newReleasesStore.range}
                        onValueChange={(value: Range) => selectRange(value)}
                    />
                </div>
            </div>
            <div class="flex w-full gap-4">
                <p class="w-full text-sm font-medium">group by</p>
                <div class="flex w-full items-center justify-end">
                    <CustomSelect
                        options={[
                            { label: 'date', value: 'date' },
                            { label: 'artist', value: 'artist' },
                            { label: 'type', value: 'type' }
                        ]}
                        selected={$newReleasesStore.group_by}
                        onValueChange={(value: GroupBy) => toggleGroupBy(value)}
                    />
                </div>
            </div>
            <div class="flex w-full gap-4">
                <p class="w-full text-sm font-medium">record types to include:</p>
                <div class="flex w-full flex-col items-center justify-end gap-2">
                    {#each Object.entries($newReleasesStore.filters) as [filter, checked]}
                        <div class="flex w-full items-center justify-end gap-2">
                            <Label for={filter}>{filter}</Label>
                            <Switch
                                id={filter}
                                {checked}
                                onCheckedChange={(checked) =>
                                    selectFilter({
                                        filter: filter as keyof Filter,
                                        checked: checked as boolean
                                    })}
                            />
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
