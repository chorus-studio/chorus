<script lang="ts">
    import { supporterStore } from '$lib/stores/supporter'

    import { Badge } from '$lib/components/ui/badge'
    import SupportDialog from '$lib/components/SupportDialog.svelte'

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
            <article class="flex w-full text-sm">
                {#if $supporterStore.isSupporter}
                    Thanks for the support! It means a lot to me and helps me continue to work on
                    chorus. Enjoy the exclusive features such as improved popup theming, progress
                    bar, PiP, and volume bar. More features are in development!
                {:else}
                    Want to help support the ongoing development of chorus? Become a supporter!
                    Supporters get access to exclusive upcoming features for FREE!
                {/if}
            </article>
            <div class="absolute bottom-0 flex justify-end">
                <SupportDialog />
            </div>
        </div>
    </div>
</div>
