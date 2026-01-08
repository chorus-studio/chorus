<script lang="ts">
    import * as Popover from '$lib/components/ui/popover'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import MoreVertical from 'lucide-svelte/icons/more-vertical'
    import Pencil from 'lucide-svelte/icons/pencil'
    import Trash2 from 'lucide-svelte/icons/trash-2'
    import EyeOff from 'lucide-svelte/icons/eye-off'
    import Copy from 'lucide-svelte/icons/copy'
    import Share2 from 'lucide-svelte/icons/share-2'

    interface Props {
        isBuiltIn: boolean
        onEdit?: () => void
        onDelete?: () => void
        onHide: () => void
        onRemix: () => void
        onExport?: () => void
    }

    let { isBuiltIn, onEdit, onDelete, onHide, onRemix, onExport }: Props = $props()

    let open = $state(false)

    function handleAction(action: () => void) {
        action()
        open = false
    }
</script>

<Popover.Root bind:open>
    <Popover.Trigger
        class="inline-flex size-6 items-center justify-center rounded-md bg-black/50 hover:bg-black/70"
        onclick={(e: MouseEvent) => e.stopPropagation()}
    >
        <MoreVertical class="size-4" />
    </Popover.Trigger>
    <Popover.Content class="w-36 p-1" align="end">
        {#if !isBuiltIn && onEdit}
            <Button
                variant="ghost"
                class="h-8 w-full justify-start gap-2 px-2 text-sm"
                onclick={() => handleAction(onEdit)}
            >
                <Pencil class="size-4" />
                Edit
            </Button>
        {/if}

        <Button
            variant="ghost"
            class="h-8 w-full justify-start gap-2 px-2 text-sm"
            onclick={() => handleAction(onRemix)}
        >
            <Copy class="size-4" />
            Remix
        </Button>

        {#if !isBuiltIn && onExport}
            <Button
                variant="ghost"
                class="h-8 w-full justify-start gap-2 px-2 text-sm"
                onclick={() => handleAction(onExport)}
            >
                <Share2 class="size-4" />
                Export
            </Button>
        {/if}

        <Separator class="my-1" />

        <Button
            variant="ghost"
            class="h-8 w-full justify-start gap-2 px-2 text-sm"
            onclick={() => handleAction(onHide)}
        >
            <EyeOff class="size-4" />
            Hide
        </Button>

        {#if !isBuiltIn && onDelete}
            <Button
                variant="ghost"
                class="h-8 w-full justify-start gap-2 px-2 text-sm text-destructive hover:text-destructive"
                onclick={() => handleAction(onDelete)}
            >
                <Trash2 class="size-4" />
                Delete
            </Button>
        {/if}
    </Popover.Content>
</Popover.Root>
