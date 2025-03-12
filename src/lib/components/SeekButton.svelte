<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    export let role: 'seek-forward' | 'seek-backward'

    function handleSeek() {
        const type = role == 'seek-forward' ? 'skip_forward' : 'skip_back'
        const value = isForward
            ? isLongForm
                ? $seekStore.long_form.forward
                : $seekStore.default.forward
            : isLongForm
              ? $seekStore.long_form.rewind
              : $seekStore.default.rewind
        window.postMessage({ type: 'FROM_SEEK_LISTENER', data: { type, value } }, '*')
    }

    const id = role == 'seek-forward' ? 'seek-player-ff-button' : 'seek-player-rw-button'
    $: isForward = role == 'seek-forward'
    $: isLongForm = $seekStore.media_type == 'long_form'
    $: seekValue = isForward
        ? isLongForm
            ? $seekStore.long_form.forward
            : $seekStore.default.forward
        : isLongForm
          ? $seekStore.long_form.rewind
          : $seekStore.default.rewind
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            {id}
            onclick={handleSeek}
            aria-label={role == 'seek-forward' ? 'Seek forward' : 'Seek backward'}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'relative flex size-8 items-center justify-center border-none bg-transparent stroke-none px-0 hover:bg-transparent [&_svg]:size-[1.5rem]'
            })}
        >
            <span
                class="absolute top-1/2 bg-transparent text-center text-xs font-bold {role ==
                'seek-forward'
                    ? 'left-[50%]'
                    : 'right-[50%]'}"
            >
                {seekValue}
            </span>
            <svg
                class="-z-10 h-6 w-6 fill-none stroke-current stroke-[5] {role == 'seek-forward'
                    ? 'scale-x-[-1]'
                    : ''}"
                viewBox="0 0 64 64"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
            >
                <path d="M34.46,53.91A21.91,21.91,0,1,0,12.55,31.78"></path>
                <polyline points="4.65 22.33 12.52 32.62 22.81 24.75"></polyline>
            </svg>
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>{role == 'seek-forward' ? `Seek forward` : `Seek backward`}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
