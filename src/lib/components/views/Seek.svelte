<script lang="ts">
    import { onMount } from 'svelte'
    import { Minus, Plus } from "lucide-svelte"
    import { Button } from "$lib/components/ui/button"
    import { Input } from "$lib/components/ui/input"
    import { Label } from "$lib/components/ui/label"
    import { Switch } from "$lib/components/ui/switch"

    import { seekStore } from "$lib/stores/seek"

    type SeekType = 'rewind' | 'forward'
    const seekTypes = ['rewind', 'forward']

    let seekValues = $state({ rewind: $seekStore.default.rewind, forward: $seekStore.default.forward })
    let checked = $state($seekStore.is_long_form)
    let setting = $state($seekStore.is_long_form ? 'PA' : 'G')

    async function adjustValue(type: SeekType, amount: number) {
        seekValues[type] = Math.min(Math.max(seekValues[type] + amount, 1), 60)
        // Manually update the input's text content
        const input = document.getElementById(`seek-${type}`) as HTMLInputElement
        if (input) {
            input.value = seekValues[type].toString()
        }
        const updateType = setting === 'G' ? 'default' : 'long_form'
        await seekStore.updateSeek({ type: updateType, seek: { key: type, value: seekValues[type] } })
    }

    async function handleCheckedChange(ticked: boolean) {
        checked = ticked
        setting = ticked ? 'PA' : 'G'
        if (setting == 'G') {
            seekValues = { rewind: $seekStore.default.rewind, forward: $seekStore.default.forward }
        } else {
            seekValues = { rewind: $seekStore.long_form.rewind, forward: $seekStore.long_form.forward }
        }
        await seekStore.toggleLongForm()
    }

    // Update initial values when component mounts
    onMount(() => {
        seekTypes.forEach(type => {
            const input = document.getElementById(`seek-${type}`) as HTMLInputElement
            if (input) {
                input.value = seekValues[type as keyof typeof seekValues].toString()
            }
        })
    })
</script>

<div class="flex flex-col justify-center py-2 space-y-3 w-full">
    <div class="flex items-center justify-between">
        {#each seekTypes as type}
            <div class="flex items-center gap-x-1.5">
                <Button
                    size="icon"
                    type="button"
                    id={`seek-${type}-minus`}
                    onclick={() => adjustValue(type as SeekType, -1)}
                    class="bg-zinc-700 rounded-sm hover:bg-zinc-800 border-none w-8 h-8"
                >
                    <Minus color="white" size={24} />
                </Button>
                <div class="relative h-12">
                    <Input bind:value={seekValues[type as keyof typeof seekValues]} class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 py-0 px-0.5 text-xl md:text-xl text-center w-8 h-7 bg-transparent text-white border-none" />
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="fill-none {type === 'rewind' ? 'scale-x-100' : 'scale-x-[-1]'} h-full">
                        <g class="stroke-[#1ed760] stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m14.55 21.67c4.29-1.13 7.45-5.03 7.45-9.67 0-5.52-4.44-10-10-10-6.67 0-10 5.56-10 5.56m0 0v-4.56m0 4.56h2.01 2.43"></path>
                            <path d="m2 12c0 5.52 4.48 10 10 10" opacity=".4" stroke-dasharray="3 3"></path>
                        </g>
                    </svg>
                </div>
                <Button
                    type="button"
                    id={`seek-${type}-plus`}
                    onclick={() => adjustValue(type as SeekType, 1)}
                    size="icon"
                    class="bg-zinc-700 rounded-sm hover:bg-zinc-800 border-none w-8 h-8"
                >
                    <Plus color="white" size={24} />
                </Button>
            </div>
        {/each}
    </div>

    <div class="flex items-center justify-between w-full">
        <div class="flex items-center">
            {#each ['G', 'PA'] as item}
                <span id={`${item}-setting`} class="{item === setting ? 'bg-[green]' : 'bg-transparent'} font-bold text-center w-7 h-6 text-white">{item}</span>
            {/each}
        </div>

        <div class="flex items-center gap-x-2 justify-end">
            <Label class="text-base lowercase">{setting === 'G' ? 'Global' : 'Podcasts/Audiobooks'}</Label>
            <Switch checked={checked} onCheckedChange={handleCheckedChange} />
        </div>
    </div>
</div>