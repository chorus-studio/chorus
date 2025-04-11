<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { Minus, Plus } from 'lucide-svelte'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import BadgeList from '$lib/components/BadgeList.svelte'

    export let type: 'rewind' | 'forward'

    async function handleClick(e: MouseEvent) {
        e.preventDefault()
        const target = e.target as HTMLButtonElement
        const operator = target.id.includes('minus') ? -1 : 1
        const newValue = Math.min(Math.max(value + operator, 1), 60)
        await handleSeekUpdate(newValue)
    }

    async function handleSeekUpdate(value: number) {
        const updateType = $seekStore.is_long_form ? 'long_form' : 'default'
        await seekStore.updateSeek({
            [updateType]: {
                ...$seekStore[updateType],
                [type]: value
            }
        })
    }

    $: value =
        type === 'rewind'
            ? $seekStore.is_long_form
                ? $seekStore.long_form.rewind
                : $seekStore.default.rewind
            : $seekStore.is_long_form
              ? $seekStore.long_form.forward
              : $seekStore.default.forward
</script>

<div class="flex flex-col items-center gap-y-2">
    <BadgeList list={[5, 10, 15, 30]} handleSelect={handleSeekUpdate} />
    <div class="flex w-full items-center justify-between">
        <Button
            size="icon"
            type="button"
            id={`seek-${type}-minus`}
            onclick={handleClick}
            class="h-8 w-8 rounded-sm border-none bg-zinc-700 hover:bg-zinc-800"
        >
            <Minus color="white" size={24} />
        </Button>
        <div class="relative h-12">
            <Input
                {value}
                class="absolute left-1/2 top-1/2 h-7 w-8 -translate-x-1/2 -translate-y-1/2 border-none bg-transparent px-0.5 py-0 text-center text-xl text-white md:text-xl"
            />
            <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                class="fill-none {type === 'rewind' ? 'scale-x-100' : 'scale-x-[-1]'} h-full"
            >
                <g
                    class="stroke-[#1ed760] stroke-[1.5]"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="m14.55 21.67c4.29-1.13 7.45-5.03 7.45-9.67 0-5.52-4.44-10-10-10-6.67 0-10 5.56-10 5.56m0 0v-4.56m0 4.56h2.01 2.43"
                    ></path>
                    <path d="m2 12c0 5.52 4.48 10 10 10" opacity=".4" stroke-dasharray="3 3"></path>
                </g>
            </svg>
        </div>
        <Button
            type="button"
            id={`seek-${type}-plus`}
            onclick={handleClick}
            size="icon"
            class="h-8 w-8 rounded-sm border-none bg-zinc-700 hover:bg-zinc-800"
        >
            <Plus color="white" size={24} />
        </Button>
    </div>
</div>
