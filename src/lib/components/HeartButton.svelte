<script lang="ts">
    import { Button } from '$lib/components/ui/button'
    import { Heart } from 'lucide-svelte'
</script>

<Button variant="ghost" role="button" aria-label="Like" size="icon" class="size-7 px-0 [&_svg]:size-[1.125rem]">
    <Heart size={24} />
</Button>