<script lang="ts">
    import { toast } from 'svelte-sonner'
    import { mellowtel } from '$lib/utils/mellowtel'

    import { supporterStore } from '$lib/stores/supporter'
    import { settingsStore } from '$lib/stores/settings'
    import { buttonVariants } from '$lib/components/ui/button'
    import * as AlertDialog from '$lib/components/ui/alert-dialog'

    export let closeDialog: () => void

    async function handleOptIn() {
        await mellowtel.optIn()
        await mellowtel.start()
        toast.success('Thanks for supporting Chorus!')
        await supporterStore.sync()
    }

    async function handleOptOut() {
        try {
            await mellowtel.optOut()
            closeDialog()
            toast('You are no longer opted in to Mellowtel.', {
                description: 'You can opt in anytime via support tab or the button below.',
                action: {
                    label: 'Opt-in',
                    onClick: async () => await handleOptIn()
                }
            })

            await supporterStore.sync()
            await settingsStore.rescindSupport()
        } catch (error) {
            console.error(error)
            toast.error('Failed to opt out')
        }
    }
</script>

<AlertDialog.Root>
    <AlertDialog.Trigger
        class={buttonVariants({ variant: 'destructive', size: 'sm', class: 'h-7 text-sm' })}
    >
        opt out
    </AlertDialog.Trigger>
    <AlertDialog.Content class="md:w-1/2 w-11/12 rounded-lg bg-primary-foreground p-4">
        <AlertDialog.Header>
            <AlertDialog.Title class="text-lg">Opt out of Mellowtel?</AlertDialog.Title>
            <AlertDialog.Description class="text-left text-base">
                Opting out means losing access to some free features enabled by Mellowtel's support.
                Are you sure?
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <div class="flex w-full items-center justify-end gap-2">
                <AlertDialog.Cancel
                    class={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                        class: 'mt-0 h-7 text-sm'
                    })}
                >
                    cancel
                </AlertDialog.Cancel>
                <AlertDialog.Action
                    onclick={handleOptOut}
                    class={buttonVariants({
                        variant: 'destructive',
                        size: 'sm',
                        class: 'h-7 text-sm'
                    })}
                >
                    confirm
                </AlertDialog.Action>
            </div>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
