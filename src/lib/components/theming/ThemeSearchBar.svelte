<script lang="ts">
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import Search from 'lucide-svelte/icons/search'
    import X from 'lucide-svelte/icons/x'

    interface Props {
        value: string
        placeholder?: string
    }

    let { value = $bindable(''), placeholder = 'Search themes...' }: Props = $props()
</script>

<div class="flex items-center gap-2">
    <div class="relative flex-1">
        <Search class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
            type="text"
            bind:value
            {placeholder}
            class="h-8 pl-8 pr-8 text-sm"
        />
        {#if value}
            <Button
                variant="ghost"
                size="icon"
                class="absolute right-1 top-1/2 size-6 -translate-y-1/2"
                onclick={() => (value = '')}
            >
                <X class="size-3" />
            </Button>
        {/if}
    </div>
</div>
