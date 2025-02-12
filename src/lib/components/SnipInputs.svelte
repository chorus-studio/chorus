<script lang="ts">
    import { Input } from '$lib/components/ui/input'
    import { Switch } from '$lib/components/ui/switch'
    import { Label } from '$lib/components/ui/label'
</script>

<div class="grid grid-cols-5 gap-x-2">
    <div class="flex flex-col col-span-3 items-center gap-y-1.5">
        <div class="flex items-center h-6">
            <Label for="start" class="text-center leading-5 border-none text-sm min-w-12 px-2 w-12 h-6 bg-zinc-700">Start</Label>
            <Input id="start" class="w-full h-6 rounded-none bg-[green] border-none" />
        </div>
        <div class="flex w-full items-center">
            <Label for="end" class="text-center leading-5 border-none text-sm min-w-12 px-2 w-12 h-6 bg-zinc-700">End</Label>
            <Input id="end" class="w-full h-6 rounded-none bg-[green] border-none" />
        </div>
    </div>

    <div class="flex items-center col-span-2 w-full gap-x-1 justify-end">
        <Label for="loop" class="text-sm">Auto Loop</Label>
        <Switch id="loop" />
    </div>
</div>

<p class="text-xs text-end text-zinc-300 w-full">*changes are temporary and will <span class="font-semibold italic">reset</span> unless saved.</p>

