<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { mediaStore } from '$lib/stores/media'
    import { Button } from '$lib/components/ui/button'

    const SVG_PATHS: Record<string, string> = {
        seek: '<path d="M34.46,53.91A21.91,21.91,0,1,0,12.55,31.78"/><polyline points="4.65 22.33 12.52 32.62 22.81 24.75"/>',
        'block-track':
            '<path fill-rule="evenodd" d="M5.965 4.904l9.131 9.131a6.5 6.5 0 00-9.131-9.131zm8.07 10.192L4.904 5.965a6.5 6.5 0 009.131 9.131zM4.343 4.343a8 8 0 1111.314 11.314A8 8 0 014.343 4.343z" clip-rule="evenodd"/>',
        play: '<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"/>',
        pause: '<path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"/>',
        next: '<path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"/>',
        previous:
            '<path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"/>',
        'save/unsave':
            '<path d="M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z"/>',
        shuffle:
            '<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"/><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"/>',
        repeat: '<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"/>',
        repeat1:
            '<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5zM12.25 2.5h-.75V1h.75A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25z"/><path d="M9.12 8V1H7.787c-.128.72-.76 1.293-1.787 1.313V3.36h1.57V8h1.55z"/>',
        loop: '<path xmlns="http://www.w3.org/2000/svg" d="m16 28.0063c-4.6831 0-8.49375-3.8075-8.5-8.4894-.005-.4138.02437-5.6125 4.245-9.91878.3962-.40437.8162-.78749 1.2575-1.14874-2.55-.96375-5.92312-1.44938-9.5025-1.44938-.82812 0-1.5-.67188-1.5-1.5s.67188-1.5 1.5-1.5c4.8675 0 9.2506.83875 12.5106 2.50062 3.2563-1.65375 7.6325-2.48812 12.4894-2.48812.8281 0 1.5.67188 1.5 1.5 0 .82813-.6719 1.5-1.5 1.5-3.5712 0-6.9388.48312-9.485 1.44187.4337.35563.8456.73188 1.2356 1.13 4.2219 4.30563 4.2544 9.50443 4.25 9.92003v.0025c-.0006 4.6862-3.8137 8.4994-8.5006 8.4994zm.0081-18.04255c-.7818.51185-1.4887 1.08995-2.12 1.73435-3.4331 3.5025-3.3887 7.7356-3.3881 7.7781v.0301c0 3.0325 2.4675 5.5 5.5 5.5s5.5-2.4675 5.5-5.5v-.0388c0-.1538-.0406-4.3962-3.43-7.8219-.6163-.6231-1.3037-1.1837-2.0619-1.68185z"/>'
    }

    const { icon, viewBox = '-4 -4 24 24', size = 20, strokeWidth = 1, handleClick } = $props()

    const isPlayPause = icon === 'play' || icon === 'pause'
    const isSeek = icon.startsWith('seek')
    const isRepeat = ['shuffle', 'loop', 'repeat', 'repeat1'].includes(icon)

    function showDot(icon: string) {
        if (!isRepeat) return false

        if (icon.startsWith('repeat')) {
            if (icon == 'repeat1') return true
            return $mediaStore.repeat == 'default'
        }

        if (icon == 'loop') return $mediaStore.loop
        if (icon == 'shuffle') return $mediaStore.shuffle

        return false
    }

    function onClick() {
        const role = ['play', 'pause'].includes(icon)
            ? 'play/pause'
            : icon?.startsWith('repeat')
              ? 'repeat'
              : icon
        handleClick(role)
    }

    const alwaysFill = ['loop', 'block-track', 'next', 'previous', 'repeat', 'repeat1', 'shuffle']

    function getFillColor(icon: string) {
        if (icon == 'save/unsave') {
            if ($mediaStore.saved) return 'fill-[var(--text)]'
            return 'fill-none'
        }
        return alwaysFill.includes(icon) ? 'fill-[var(--text)]' : 'fill-[var(--bg)]'
    }
</script>

<Button
    onclick={onClick}
    size="icon"
    variant="ghost"
    role={icon}
    class="relative flex items-center justify-center gap-0 border-none p-0 hover:scale-[120%] {isPlayPause
        ? 'h-7 w-7 rounded-full bg-[var(--text)] hover:bg-[var(--text)] [&_svg]:size-[20px]'
        : `h-6 w-6 bg-transparent hover:bg-transparent [&_svg]:size-[${size}px]`}"
>
    {#if isSeek}
        <span
            class="bg-transprent absolute top-[38%] z-10 font-bold {icon == 'seek-forward'
                ? 'left-1/2'
                : 'right-1/2'} leading-0 flex text-center text-[12px] text-[var(--text)]"
        >
            {icon == 'seek-forward'
                ? $seekStore.is_long_form
                    ? $seekStore.long_form.forward
                    : $seekStore.default.forward
                : $seekStore.is_long_form
                  ? $seekStore.long_form.rewind
                  : $seekStore.default.rewind}
        </span>
    {/if}
    {#if isRepeat && showDot(icon)}
        <span class="absolute bottom-1.5 h-1 text-xs text-[var(--text)]" id="{icon}-dot"
            >&bull;</span
        >
    {/if}
    <svg
        xmlns="http://www.w3.org/2000/svg"
        stroke-width={strokeWidth}
        preserveAspectRatio="xMidYMid meet"
        {viewBox}
        class="size-[{size}px] stroke-[var(--text)] {getFillColor(icon)} {isPlayPause
            ? 'fill-[var(--bg)] stroke-[var(--bg)]'
            : ''} {icon == 'seek-forward' ? 'scale-x-[-1]' : ''}"
    >
        {#if icon.startsWith('seek')}
            {@html SVG_PATHS.seek}
        {:else}
            {@html SVG_PATHS[icon]}
        {/if}
    </svg>
</Button>
