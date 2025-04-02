<script lang="ts">
    import { toast } from 'svelte-sonner'
    import { mellowtel } from '$lib/utils/mellowtel'
    import { isSupporter } from '$lib/stores/supporter'

    import { Button } from './ui/button'
    import * as AlertDialog from './ui/alert-dialog'

    export let closeDialog: () => void

    async function handleOptIn() {
        await mellowtel.optIn()
        await mellowtel.start()
        toast.success('Thanks for supporting Chorus!')
        isSupporter.set(true)
    }

    async function handleOptOut() {
        try {
            await mellowtel.optOut()
            closeDialog()
            toast('You are no longer opted in to Mellowtel.', {
                description: 'You can opt in anytime via support tab or the button below.',
                action: {
                    label: 'Opt-in',
                    onClick: async () => {
                        await handleOptIn()
                    }
                }
            })
        } catch (error) {
            console.error(error)
            toast.error('Failed to opt out')
        }
    }
</script>

<AlertDialog.Root>
    <AlertDialog.Trigger>
        <Button variant="destructive" size="sm" class="xs:text-base text-sm sm:text-lg"
            >opt out</Button
        >
    </AlertDialog.Trigger>
    <AlertDialog.Content class="w-11/12 rounded-lg p-4 md:w-3/4">
        <AlertDialog.Title class="xs:text-lg text-left text-base">
            Opt out of Mellowtel?
        </AlertDialog.Title>
        <AlertDialog.Description class="xs:text-sm text-left text-xs sm:text-base">
            Opting out means losing access to some free features enabled by Mellowtel's support. Are
            you sure?
        </AlertDialog.Description>
        <AlertDialog.Footer>
            <div class="flex w-full items-center justify-end gap-2">
                <AlertDialog.Cancel
                    class="xs:text-sm mt-0 bg-primary-foreground text-xs sm:text-base"
                    >cancel</AlertDialog.Cancel
                >
                <AlertDialog.Action
                    onclick={handleOptOut}
                    class="xs:text-sm bg-destructive text-xs text-destructive-foreground shadow-sm  hover:bg-destructive/90 sm:text-base"
                    >confirm</AlertDialog.Action
                >
            </div>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
