<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { formatTimeInSeconds, timeToSeconds, secondsToTime } from '$lib/utils/time'

    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import { Button } from '$lib/components/ui/button'

    type SnipKey = 'start_time' | 'end_time'

    function timeToMilliseconds(time: number[]) {
        const [hours, mins, secs, ms] = time
        return hours * 60 * 60 * 1000 + mins * 60 * 1000 + secs * 1000 + ms
    }

    function handleChange(event: Event) {
        const input = event.target as HTMLInputElement
        const value = input.value
        const id = input.id as SnipKey
        if (!value || !$snipStore) return

        const isValid = validateTime({ value, maxValue: secondsToTime($nowPlaying.duration) })
        if (!isValid) return

        const updatedHandle = id === 'start_time' ? 'start' : 'end'
        const updatedTime = timeToSeconds(value!)
        if (updatedTime) {
            snipStore.set({ ...$snipStore, [id]: updatedTime, last_updated: updatedHandle })
            nowPlaying.setCurrentTime(updatedTime)
        }
    }

    function validateTime({ value, maxValue }: { value: string; maxValue: string }) {
        const regex = /^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/
        const match = value.match(regex)

        if (!match) return false

        const totalMilliseconds = timeToMilliseconds(Array.from(match.slice(1)).map(Number))
        const maxTotalMilliseconds = timeToMilliseconds(maxValue.split(':').map(Number))

        if (totalMilliseconds < 0 || totalMilliseconds > maxTotalMilliseconds) return false

        return true
    }

    function handlePlayPause() {
        const playPauseButton = document.querySelector(
            '[data-testid="control-button-playpause'
        ) as HTMLButtonElement
        playPauseButton?.click()
    }

    function restart() {
        if (!$snipStore) return
        nowPlaying.setCurrentTime($snipStore.start_time!)
    }
</script>

{#if $snipStore}
    <p class="-mt-3 flex w-full text-xs text-muted-foreground">
        * while editing "end", track plays 3 secs past set end
    </p>

    <div class="-mt-2 grid w-full grid-cols-2">
        <div class="flex flex-col items-center gap-y-1">
            <div class="flex h-6 w-full items-center">
                <Label
                    for="start_time"
                    class="h-6 w-12 min-w-12 border-none bg-zinc-700 px-2 py-0 pb-[0.075rem] text-center text-base font-bold lowercase leading-5"
                    >Start</Label
                >
                <Input
                    id="start_time"
                    value={formatTimeInSeconds($snipStore.start_time!)}
                    onchange={handleChange}
                    class="h-6 w-24 rounded-none border-none bg-green-700 pr-2 text-end text-base font-bold tracking-wide text-white"
                />
            </div>
            <div class="flex w-full items-center">
                <Label
                    for="end_time"
                    class="h-6 w-12 min-w-12 border-none bg-zinc-700 px-2 py-0 pb-[0.075rem] text-center text-base font-bold lowercase leading-5"
                    >End</Label
                >
                <Input
                    id="end_time"
                    value={formatTimeInSeconds($snipStore.end_time!)}
                    onchange={handleChange}
                    class="h-6 w-24 rounded-none border-none bg-green-700 pr-2 text-end text-base font-bold lowercase tracking-wide text-white"
                />
            </div>
        </div>

        <div class="flex w-full flex-col items-center gap-1">
            <p class="text-sm text-muted-foreground">
                snip length: {secondsToTime($snipStore.end_time! - $snipStore.start_time!)}
            </p>
            <div class="flex items-center justify-between gap-x-2">
                <Button
                    size="icon"
                    variant="ghost"
                    onclick={restart}
                    class="size-6 rounded-full border-none bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.25rem]"
                >
                    <svg
                        class="size-5 fill-none stroke-current stroke-[5]"
                        viewBox="0 0 64 64"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <path d="M34.46,53.91A21.91,21.91,0,1,0,12.55,31.78"></path>
                        <polyline points="4.65 22.33 12.52 32.62 22.81 24.75"></polyline>
                    </svg>
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onclick={handlePlayPause}
                    class="size-7 rounded-full bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.5rem]"
                >
                    <svg
                        class="h-6 w-6 fill-none stroke-current stroke-1"
                        viewBox="-4 -4 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {#if $mediaStore.playing}
                            <path
                                d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"
                            />
                        {:else}
                            <path
                                d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"
                            />
                        {/if}
                    </svg>
                </Button>
            </div>
        </div>
    </div>
{/if}
