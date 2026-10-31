<script lang="ts">
    import { toast } from 'svelte-sonner'
    import {
        DEFAULT_IMAGE_OPTIONS,
        IMAGE_BLUR_MAX,
        IMAGE_DIM_MAX,
        IMAGE_SATURATE_MAX,
        isVideoBackdrop,
        type ImageBackdrop,
        type ImageFit
    } from '$lib/types/look'
    import {
        MAX_BYTES,
        MAX_STILL_EDGE,
        MAX_VIDEO_BYTES,
        MAX_VIDEO_SECONDS,
        WallpaperError,
        importWallpaper,
        saveWallpaper
    } from '$lib/utils/wallpapers'
    import ImageIcon from '@lucide/svelte/icons/image'
    import Link from '@lucide/svelte/icons/link'
    import LoaderCircle from '@lucide/svelte/icons/loader-circle'
    import WandSparkles from '@lucide/svelte/icons/wand-sparkles'
    import { Switch } from '$lib/components/ui/switch'
    import { Button } from '$lib/components/ui/button'
    import { Input } from '$lib/components/ui/input'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import AnchorGrid from './AnchorGrid.svelte'

    // The image half of the Backdrop section: a drop zone until a picture is
    // in, then the picture's chip and its controls. A dropped file is checked
    // and stored under the look's id (utils/wallpapers.ts); a link is used as
    // it is.
    let {
        backdrop,
        wallpaperId,
        onChange,
        onMatch
    }: {
        backdrop: ImageBackdrop | null
        /** The storage id a dropped file is kept under: the look's own id. */
        wallpaperId: string
        onChange: (backdrop: ImageBackdrop) => void
        /** Asked to read a palette from the picture ("Match to backdrop"). */
        onMatch: (backdrop: ImageBackdrop) => void
    } = $props()

    let fileInput = $state<HTMLInputElement | null>(null)
    let busy = $state(false)
    let dragging = $state(false)
    let linking = $state(false)
    let link = $state('')

    const options = () => (backdrop ? backdrop : { ...DEFAULT_IMAGE_OPTIONS })
    const patch = (changes: Partial<ImageBackdrop>) => {
        if (backdrop) onChange({ ...backdrop, ...changes })
    }

    async function takeFile(file: File | undefined) {
        if (!file || busy) return
        busy = true
        try {
            const imported = await importWallpaper(file)
            await saveWallpaper(wallpaperId, imported)
            const { fit, anchor, dim, blur, saturate, tint, animate } = options()
            onChange({
                kind: 'image',
                source: { type: 'file', id: wallpaperId },
                info: imported.info,
                fit,
                anchor,
                dim,
                blur,
                saturate,
                tint,
                animate
            })
        } catch (error) {
            toast.error(
                error instanceof WallpaperError ? error.message : 'That image could not be used.'
            )
        } finally {
            busy = false
            if (fileInput) fileInput.value = ''
        }
    }

    function useLink() {
        const url = link.trim()
        if (!/^https?:\/\//i.test(url)) {
            toast.error('Paste a link that starts with https://')
            return
        }
        const { fit, anchor, dim, blur, saturate, tint, animate } = options()
        onChange({
            kind: 'image',
            source: { type: 'url', url },
            info: undefined,
            fit,
            anchor,
            dim,
            blur,
            saturate,
            tint,
            animate
        })
        linking = false
        link = ''
    }

    function onDrop(e: DragEvent) {
        e.preventDefault()
        dragging = false
        takeFile(e.dataTransfer?.files?.[0])
    }

    const sizeText = (bytes: number) =>
        bytes >= 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(bytes / 1024)} KB`

    const LABEL = 'text-[13px] font-semibold text-ink-fg'
    const HINT = 'text-xs leading-snug text-ink-muted'
    const VALUE = 'font-mono text-xs text-ink-fg-2'
    const ROW =
        'flex items-center justify-between gap-x-3 rounded-[10px] border border-hairline bg-inset px-3 py-2.5'
    const MB = (bytes: number) => Math.round(bytes / (1024 * 1024))
</script>

<input
    bind:this={fileInput}
    type="file"
    accept="image/*,video/mp4,video/webm"
    class="hidden"
    onchange={(e) => takeFile(e.currentTarget.files?.[0])}
/>

{#if !backdrop}
    <div
        role="group"
        aria-label="Add a picture or video"
        class="flex flex-col items-center justify-center gap-y-2.5 rounded-[10px] border border-dashed px-4 py-7 text-center transition-colors {dragging
            ? 'border-signal bg-signal/5'
            : 'border-hairline-strong bg-inset'}"
        ondragover={(e) => {
            e.preventDefault()
            dragging = true
        }}
        ondragleave={() => (dragging = false)}
        ondrop={onDrop}
    >
        {#if busy}
            <LoaderCircle class="size-6 animate-spin text-ink-muted" />
            <span class="text-[13px] text-ink-muted">Reading the picture…</span>
        {:else}
            <ImageIcon class="size-6 text-ink-muted" />
            <span class="text-[13px] font-medium text-ink-fg"
                >Drop a picture, GIF or short video here</span
            >
            <div class="flex items-center gap-x-2">
                <Button variant="outline" size="sm" onclick={() => fileInput?.click()}
                    >Browse…</Button
                >
                <Button variant="outline" size="sm" onclick={() => (linking = !linking)}>
                    <Link class="size-3.5" />
                    Paste a link
                </Button>
            </div>
            <span class={HINT}>
                JPEG, PNG, WebP, GIF or APNG up to {MB(MAX_BYTES)} MB; MP4 or WebM up to {MB(
                    MAX_VIDEO_BYTES
                )} MB and {MAX_VIDEO_SECONDS} s. Stills are resized to {MAX_STILL_EDGE} px.
            </span>
        {/if}
    </div>
{:else}
    <div class="flex items-center gap-x-3 rounded-[10px] border border-hairline bg-inset p-2.5">
        <span
            class="block h-11 w-16 shrink-0 rounded-lg border border-hairline bg-inset bg-cover bg-center"
            style={backdrop.info?.thumb
                ? `background-image: url("${backdrop.info.thumb}")`
                : backdrop.source.type === 'url'
                  ? `background-image: url("${backdrop.source.url.replace(/"/g, '%22')}")`
                  : ''}
            role="img"
            aria-label="The picture"
        ></span>
        <div class="flex min-w-0 flex-1 flex-col gap-y-0.5">
            <span class="truncate text-[13px] font-semibold text-ink-fg">
                {backdrop.info?.name ??
                    (backdrop.source.type === 'url' ? backdrop.source.url : 'Picture')}
            </span>
            <span class="truncate font-mono text-[11px] text-ink-muted">
                {#if backdrop.info}
                    {backdrop.info.width} × {backdrop.info.height} · {sizeText(backdrop.info.bytes)}
                    {backdrop.info.video
                        ? `· video${backdrop.info.duration ? ` ${backdrop.info.duration} s` : ''}`
                        : backdrop.info.animated
                          ? '· animated'
                          : ''} · kept in Chorus
                {:else}
                    linked {isVideoBackdrop(backdrop) ? 'video' : ''} · loads from its address each time
                {/if}
            </span>
        </div>
        {#if busy}
            <LoaderCircle class="size-4 animate-spin text-ink-muted" />
        {/if}
        <Button variant="outline" size="sm" onclick={() => fileInput?.click()} disabled={busy}>
            Replace
        </Button>
        <Button
            variant="outline"
            size="icon-sm"
            onclick={() => (linking = !linking)}
            aria-label="Use a link instead"
            title="Use a link instead"
        >
            <Link class="size-3.5" />
        </Button>
        <Button
            variant="outline"
            size="sm"
            onclick={() => onMatch(backdrop)}
            title="Pick the base and accent colours from this picture"
        >
            <WandSparkles class="size-3.5" />
            Match palette
        </Button>
    </div>
{/if}

{#if linking}
    <form
        class="flex items-center gap-x-2"
        onsubmit={(e) => {
            e.preventDefault()
            useLink()
        }}
    >
        <Input
            type="url"
            bind:value={link}
            placeholder="https://…/picture.jpg"
            aria-label="Picture link"
            class="h-8 text-[13px]"
        />
        <Button type="submit" size="sm">Use link</Button>
    </form>
{/if}

{#if backdrop}
    <div class="flex items-center justify-between gap-x-3">
        <span class={LABEL}>Fit</span>
        <SegmentedControl
            size="sm"
            ariaLabel="Fit"
            value={backdrop.fit}
            onValueChange={(v) => patch({ fit: v as ImageFit })}
            options={[
                { label: 'Fill', value: 'cover', title: 'Fill the window, cropping the edges' },
                { label: 'Whole', value: 'contain', title: 'Show the whole picture' },
                { label: 'Tile', value: 'tile', title: 'Repeat the picture at its own size' }
            ]}
        />
    </div>
    <div class="flex items-center justify-between gap-x-3">
        <div class="flex flex-col gap-y-0.5">
            <span class={LABEL}>Anchor</span>
            <span class={HINT}>Which part stays in view when the window is narrow</span>
        </div>
        <AnchorGrid value={backdrop.anchor} onChange={(anchor) => patch({ anchor })} />
    </div>

    <div class="flex flex-col gap-y-1.5">
        <div class="flex items-center justify-between">
            <span class={LABEL}>Dim</span>
            <span class={VALUE}>{backdrop.dim} %</span>
        </div>
        <CustomSlider
            type="single"
            min={0}
            max={IMAGE_DIM_MAX}
            step={5}
            value={backdrop.dim}
            label="Dim"
            onValueChange={(v) => patch({ dim: v as number })}
        />
    </div>
    <div class="flex flex-col gap-y-1.5">
        <div class="flex items-center justify-between">
            <span class={LABEL}>Blur</span>
            <span class={VALUE}>{backdrop.blur} px</span>
        </div>
        <CustomSlider
            type="single"
            min={0}
            max={IMAGE_BLUR_MAX}
            step={2}
            value={backdrop.blur}
            label="Blur"
            onValueChange={(v) => patch({ blur: v as number })}
        />
    </div>
    <div class="flex flex-col gap-y-1.5">
        <div class="flex items-center justify-between">
            <span class={LABEL}>Saturation</span>
            <span class={VALUE}>{backdrop.saturate} %</span>
        </div>
        <CustomSlider
            type="single"
            min={0}
            max={IMAGE_SATURATE_MAX}
            step={10}
            value={backdrop.saturate}
            label="Saturation"
            onValueChange={(v) => patch({ saturate: v as number })}
        />
    </div>

    <div class={ROW}>
        <div class="flex min-w-0 flex-col gap-y-0.5">
            <span class={LABEL}>Tint with the palette</span>
            <span class={HINT}
                >The dim wash takes the frame colour instead of black, white in Light</span
            >
        </div>
        <Switch
            checked={backdrop.tint}
            onCheckedChange={(v) => patch({ tint: v })}
            aria-label="Tint with the palette"
        />
    </div>
    {#if backdrop.info?.animated || isVideoBackdrop(backdrop)}
        <div class={ROW}>
            <div class="flex min-w-0 flex-col gap-y-0.5">
                <span class={LABEL}
                    >{isVideoBackdrop(backdrop) ? 'Play the video' : 'Play the animation'}</span
                >
                <span class={HINT}>Off, or under Reduce motion, a still frame shows</span>
            </div>
            <Switch
                checked={backdrop.animate}
                onCheckedChange={(v) => patch({ animate: v })}
                aria-label="Play the animation"
            />
        </div>
    {/if}
{/if}
