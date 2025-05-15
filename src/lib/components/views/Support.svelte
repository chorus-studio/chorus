<script lang="ts">
    import { supporterStore } from '$lib/stores/supporter'

    import { Badge } from '$lib/components/ui/badge'

    const checkOptInStatus = async () => await supporterStore.sync()

    onMount(() => checkOptInStatus())
</script>

<div class="flex h-full w-full flex-col justify-between space-y-2">
    <div class="flex h-full w-full justify-between">
        <div class="flex w-full flex-col gap-y-2.5">
            <div class="flex items-center gap-x-2">
                <h2 class="text-base font-semibold underline">Tier:</h2>
                <Badge variant="default" class="h-5 rounded-[2px] text-sm"
                    >{$supporterStore.isSupporter ? 'supporter' : 'basic'}</Badge
                >
            </div>
            <article class="flex w-full flex-col gap-y-2 text-sm">
                <h2 class="text-sm font-semibold">
                    {$supporterStore.isSupporter
                        ? 'Thanks for the support!'
                        : 'Love Chorus? Help it grow!'}
                </h2>
                <p class="text-xs">Supporters get access to the following features:</p>

                <ul class="grid list-inside list-none grid-cols-2 gap-1 text-xs">
                    <li>⭐ v2 Popup theming</li>
                    <li>⭐ v2 Progress bar</li>
                    <li>⭐ v2 PiP mode</li>
                    <li>⭐ v2 Song notifications</li>
                    <li>⭐ v2 Volume bar</li>
                </ul>

                <p class="text-xs">More exclusive features are on the way!</p>
            </article>
        </div>
    </div>
</div>
