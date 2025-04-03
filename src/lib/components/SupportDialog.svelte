<script lang="ts">
    import { writable } from 'svelte/store'
    import { onMount } from 'svelte'
    import { mellowtel } from '$lib/utils/mellowtel'
    import { isSupporter } from '$lib/stores/supporter'
    import { getCheckPermissionsService } from '$lib/utils/check-permissions'

    import { toast } from 'svelte-sonner'
    import * as Dialog from './ui/dialog'
    import { Button } from './ui/button'
    import SupportAlert from './SupportAlert.svelte'

    export let triggerText: string = 'Manage'

    let mellowtelLink = ''
    let dialogOpen = false

    const permissionGranted = writable(true)

    async function openOptInLink() {
        try {
            mellowtelLink = await mellowtel.generateSettingsLink()
        } catch (error) {
            console.error(error)
            toast.error('Failed to generate opt-in link')
        }
    }

    async function updateOptInStatus() {
        try {
            const status = await mellowtel.getOptInStatus()
            isSupporter.set(status)
        } catch (error) {
            console.error('Failed to check opt-in status:', error)
        }
    }

    async function grantPermission() {
        try {
            const checkPermissionsService = getCheckPermissionsService()
            const permissionGranted = await checkPermissionsService.verifyPermission()
            if (permissionGranted) {
                await userOptin()
            } else {
                toast('Permission must be granted to opt in. Click Grant to continue.')
            }
        } catch (error) {
            console.error('Failed to verify permission:', error)
            return false
        }
    }

    async function handleOptIn() {
        const checkPermissionsService = getCheckPermissionsService()
        const hasPermission = await checkPermissionsService.checkHasPermission()

        if (!hasPermission) {
            permissionGranted.set(false)
            toast('Permission must be granted to opt in. Click Grant to continue.')
            return
        }
        await userOptin()
    }

    async function userOptin() {
        await mellowtel.optIn()
        await mellowtel.start()
        await updateOptInStatus()
        dialogOpen = false
        toast.success('Thanks for supporting chorus!', {
            description: 'Your continued support helps keep Chorus free and running for everyone.'
        })
    }

    onMount(() => {
        updateOptInStatus()
        openOptInLink()
    })
</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger>
        <Button variant="outline" size="sm" class="h-8 text-sm">{triggerText}</Button>
    </Dialog.Trigger>

    <Dialog.Content class="flex w-full flex-col rounded-lg bg-primary-foreground p-4">
        <Dialog.Header class="flex flex-col flex-wrap space-y-2">
            <Dialog.Title class="text-left text-lg">Support Chorus Development</Dialog.Title>
            <Dialog.Description class="flex-wrap text-left text-base">
                TLDR: Opt in to support new features, bug fixes, and updates.<br /> Get PRO features
                FREE.
            </Dialog.Description>
        </Dialog.Header>
        <article
            class="flex h-full flex-col gap-2 overflow-y-auto rounded-md border-2 bg-gray-700 p-2 text-sm"
        >
            <p>
                Opting in lets you share your unused internet with trusted AI labs and startups via
                the open-source <Button
                    variant="link"
                    size="sm"
                    class="h-fit px-1 py-0 text-stone-300"
                >
                    <a
                        rel="noopener noreferrer"
                        target="_blank"
                        class="underline"
                        href="https://www.mellowtel.com/mellowtel-user-guide/">Mellowtel</a
                    >
                </Button> library. In return, you'll:
            </p>
            <ul class="flex flex-col gap-y-2">
                <li>🔓 Get PRO features for FREE.</li>
                <li>✨ Help keep PRO features free for everyone.</li>
                <li>🚀 Support ongoing development.</li>
            </ul>
            <p>
                Your privacy and security are guaranteed: Mellowtel only shares bandwidth — no
                personal data is collected or sold, and the code is fully open-source and
                transparent.
            </p>
            <p>You're always in control and can opt out anytime.</p>
        </article>
        <Dialog.Footer>
            <div class="flex w-full justify-end gap-2">
                <Button variant="outline" class="h-8 text-base">
                    <a
                        target="_blank"
                        class="text-base underline"
                        rel="noopener noreferrer"
                        href={mellowtelLink}>manage</a
                    >
                </Button>
                {#if $isSupporter}
                    <SupportAlert closeDialog={() => (dialogOpen = false)} />
                {:else if !$permissionGranted}
                    <Button variant="default" onclick={grantPermission} class="h-8 text-base"
                        >grant & opt in</Button
                    >
                {:else}
                    <Button onclick={handleOptIn} variant="default" class="h-8 text-base"
                        >opt in</Button
                    >
                {/if}
            </div>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
