<script lang="ts">
    import { Button } from '$lib/components/ui/button'
    import { Ban } from 'lucide-svelte'
</script>

<Button variant="ghost" role="button" aria-label="Block" size="icon" class="size-7 px-0 [&_svg]:size-[1.125rem]">
    <Ban size={24} />
</Button>