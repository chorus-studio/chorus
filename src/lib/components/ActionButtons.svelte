<script lang="ts">
    import { Button } from '$lib/components/ui/button'
</script>

<div class="flex absolute bottom-0 w-full justify-end items-center gap-x-2">
    <Button variant="outline" size="sm" class="border-none text-primary font-semibold text-sm rounded-[4px] px-2 py-0 pb-[0.125rem] h-6 bg-purple-700 hover:bg-purple-800">
        share
    </Button>
    <Button variant="outline" size="sm" class="border-none text-primary font-semibold text-sm rounded-[4px] px-2 py-0 pb-[0.125rem] h-6 bg-red-700 hover:bg-red-800">
        reset
    </Button>
    <Button variant="outline" size="sm" class="border-none text-primary font-semibold text-sm rounded-[4px] px-2 py-0 pb-[0.125rem] h-6 bg-green-700 hover:bg-green-800">
        save
    </Button>
</div>
