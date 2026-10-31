<script lang="ts">
    import { toast } from 'svelte-sonner'
    import {
        DEFAULT_IMAGE_OPTIONS,
        IMAGE_BLUR_MAX,
        IMAGE_DIM_MAX,
        IMAGE_SATURATE_MAX,
        type ImageBackdrop,
        type ImageFit
    } from '$lib/types/look'
    import {
        MAX_BYTES,
        MAX_STILL_EDGE,
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

    const SLIDER = 'flex flex-col gap-y-1'
    const SLIDER_HEAD = 'flex items-center justify-between'
    const VALUE = 'font-mono text-[11px] text-ink-fg-2'
</script>

<input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={(e) => takeFile(e.currentTarget.files?.[0])}
/>

{#if !backdrop}
    <div
        role="group"
        aria-label="Add a picture"
        class="flex flex-col items-center justify-center gap-y-2 rounded-md border border-dashed px-3 py-5 text-center transition-colors {dragging
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
            <LoaderCircle class="size-5 animate-spin text-ink-muted" />
            <span class="text-xs text-ink-muted">Reading the picture…</span>
        {:else}
            <ImageIcon class="size-5 text-ink-muted" />
            <span class="text-xs text-ink-fg-2">Drop an image or GIF here</span>
            <div class="flex items-center gap-x-2">
                <Button variant="outline" size="xs" onclick={() => fileInput?.click()}
                    >Browse…</Button
                >
                <Button variant="outline" size="xs" onclick={() => (linking = !linking)}>
                    <Link class="size-3" />
                    Paste a link
                </Button>
            </div>
            <span class="text-[11px] leading-snug text-ink-muted">
                JPEG, PNG, WebP, GIF or APNG. Stills are resized to {MAX_STILL_EDGE} px; animations stay
                as they are, up to {Math.round(MAX_BYTES / (1024 * 1024))} MB.
            </span>
        {/if}
    </div>
{:else}
    <div class="flex items-center gap-x-2.5">
        <span
            class="block h-9 w-14 shrink-0 rounded-md border border-hairline bg-inset bg-cover bg-center"
            style={backdrop.info?.thumb
                ? `background-image: url("${backdrop.info.thumb}")`
                : backdrop.source.type === 'url'
                  ? `background-image: url("${backdrop.source.url.replace(/"/g, '%22')}")`
                  : ''}
            role="img"
            aria-label="The picture"
        ></span>
        <div class="flex min-w-0 flex-1 flex-col gap-y-0.5">
            <span class="truncate text-xs text-ink-fg">
                {backdrop.info?.name ??
                    (backdrop.source.type === 'url' ? backdrop.source.url : 'Picture')}
            </span>
            <span class="truncate font-mono text-[10px] text-ink-muted">
                {#if backdrop.info}
                    {backdrop.info.width} × {backdrop.info.height} · {sizeText(backdrop.info.bytes)}
                    {backdrop.info.animated ? '· animated' : ''} · kept in Chorus
                {:else}
                    linked · loads from its address each time
                {/if}
            </span>
        </div>
        {#if busy}
            <LoaderCircle class="size-4 animate-spin text-ink-muted" />
        {/if}
        <Button variant="outline" size="xs" onclick={() => fileInput?.click()} disabled={busy}>
            Replace
        </Button>
        <Button
            variant="outline"
            size="xs"
            onclick={() => (linking = !linking)}
            aria-label="Use a link instead"
            title="Use a link instead"
        >
            <Link class="size-3" />
        </Button>
        <Button
            variant="outline"
            size="xs"
            onclick={() => onMatch(backdrop)}
            title="Pick the base and accent colours from this picture"
        >
            <WandSparkles class="size-3" />
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
            class="h-7 text-xs"
        />
        <Button type="submit" size="xs">Use link</Button>
    </form>
{/if}

{#if backdrop}
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex items-center gap-x-2">
            <span class="rack-label">Fit</span>
            <SegmentedControl
                size="xs"
                ariaLabel="Fit"
                value={backdrop.fit}
                onValueChange={(v) => patch({ fit: v as ImageFit })}
                options={[
                    {
                        label: 'Cover',
                        value: 'cover',
                        title: 'Fill the window, cropping the edges'
                    },
                    { label: 'Contain', value: 'contain', title: 'Show the whole picture' },
                    { label: 'Tile', value: 'tile', title: 'Repeat the picture at its own size' }
                ]}
            />
        </div>
        <div class="flex items-center gap-x-2">
            <span class="rack-label">Anchor</span>
            <AnchorGrid value={backdrop.anchor} onChange={(anchor) => patch({ anchor })} />
        </div>
        <label
            class="ml-auto flex items-center gap-x-2 text-xs text-ink-fg-2"
            title="The wash over the picture is the palette's frame colour, so the gaps stay the theme's colour; off, it is plain black (white in Light)"
        >
            <Switch
                checked={backdrop.tint}
                onCheckedChange={(v) => patch({ tint: v })}
                aria-label="Tint with palette"
            />
            Tint with palette
        </label>
    </div>

    <div class="grid grid-cols-3 gap-x-4">
        <div class={SLIDER}>
            <div class={SLIDER_HEAD}>
                <span class="rack-label">Dim</span>
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
        <div class={SLIDER}>
            <div class={SLIDER_HEAD}>
                <span class="rack-label">Blur</span>
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
        <div class={SLIDER}>
            <div class={SLIDER_HEAD}>
                <span class="rack-label">Saturation</span>
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
    </div>

    {#if backdrop.info?.animated}
        <label class="flex items-center gap-x-2 text-xs text-ink-fg-2">
            <Switch
                checked={backdrop.animate}
                onCheckedChange={(v) => patch({ animate: v })}
                aria-label="Play the animation"
            />
            <span>
                Play the animation
                <span class="text-ink-muted"
                    >· off, or under Reduce motion, a still frame shows</span
                >
            </span>
        </label>
    {/if}
{/if}
