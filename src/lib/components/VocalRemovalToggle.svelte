<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { Switch } from '$lib/components/ui/switch'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import {
        DEFAULT_MIX,
        MIX_MAX,
        MIX_PRESETS,
        clampMix,
        presetOf,
        type StemMix
    } from '$lib/audio-effects/vocal-model/mix'
    import { cn } from '$lib/utils.js'

    // Vocal separation as a two-fader stem mix: how loud the vocals and the
    // instruments play, each from gone to twice as loud. The presets are the
    // common settings (Instrumental, Karaoke, Acapella, Vocals up, Original).
    let on = $state(false)
    let mix = $state<StemMix>({ ...DEFAULT_MIX })
    let error = $state('')
    let userActed = $state(false) // once true, the mount-time state snapshot is ignored
    let port: chrome.runtime.Port | null = null

    function ensurePort(): chrome.runtime.Port {
        if (port) return port
        // A named port bypasses Chorus's runtime.onMessage validator entirely.
        port = chrome.runtime.connect({ name: 'vocal' })
        port.onMessage.addListener((msg: any) => {
            if (msg?.type === 'status') {
                error = msg.error ? msg.text : ''
                if (msg.error) on = false
            } else if (msg?.type === 'state') {
                // Mount-time snapshot of the real capture state (the offscreen doc keeps
                // running after the popup closes). Ignore it once the user has acted,
                // so a late reply can't clobber their fresh choice.
                if (userActed) return
                on = !!msg.capturing
                if (msg.mix) mix = clampMix(msg.mix)
            }
        })
        port.onDisconnect.addListener(() => {
            port = null
        })
        return port
    }

    function toggle(checked: boolean) {
        on = checked
        userActed = true
        error = ''
        try {
            const p = ensurePort()
            // The mix rides with start so it applies even when no offscreen doc
            // exists yet for a separate setMix relay to land on.
            if (checked) p.postMessage({ cmd: 'start', mix })
            else p.postMessage({ cmd: 'stop' })
        } catch (e) {
            error = e instanceof Error ? e.message : String(e)
            on = false
        }
    }

    // ensurePort reconnects if the service worker bounced, so a mid-session
    // change isn't silently dropped into a dead port.
    function send(msg: unknown) {
        try {
            ensurePort().postMessage(msg)
        } catch (e) {
            error = e instanceof Error ? e.message : String(e)
        }
    }

    function setMix(next: StemMix) {
        mix = clampMix(next)
        userActed = true
        if (on) send({ cmd: 'setMix', mix })
    }

    const setFader = (key: keyof StemMix) => (value: number | number[]) =>
        setMix({ ...mix, [key]: (Array.isArray(value) ? value[0] : value) / 100 })

    const preset = $derived(presetOf(mix))
    const percent = (factor: number) => Math.round(factor * 100)

    onMount(() => {
        // Ask what's actually running so the switch reflects reality on open.
        ensurePort().postMessage({ cmd: 'getState' })
    })

    onDestroy(() => {
        port?.disconnect()
        port = null
    })

    const FADERS: Array<{ key: keyof StemMix; label: string }> = [
        { key: 'vocals', label: 'Vocals' },
        { key: 'instruments', label: 'Instruments' }
    ]
</script>

<div class="flex w-full flex-col gap-y-2.5">
    <div class="flex items-center justify-between gap-x-3">
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[13px] font-semibold text-ink-fg">Vocal separation</span>
            <span class="text-[11px] text-ink-muted">Real-time, applies to this tab</span>
        </div>
        <Switch checked={on} onCheckedChange={toggle} aria-label="Vocal separation" />
    </div>

    <div
        inert={!on}
        class="flex flex-col gap-y-2.5 transition-opacity duration-150 {on
            ? ''
            : 'pointer-events-none opacity-40'}"
    >
        <div class="flex gap-1" role="group" aria-label="Mix presets">
            {#each MIX_PRESETS as item (item.id)}
                {@const active = preset?.id === item.id}
                <button
                    type="button"
                    aria-pressed={active}
                    title={item.hint}
                    onclick={() => setMix(item.mix)}
                    class={cn(
                        'chorus-focus inline-flex h-6 flex-1 items-center justify-center rounded-md px-1 text-[10.5px] transition-colors',
                        active
                            ? 'bg-signal font-semibold text-ink'
                            : 'bg-surface-2 text-ink-fg-2 hover:text-ink-fg'
                    )}
                >
                    {item.label}
                </button>
            {/each}
        </div>

        <!-- One row per stem: name, a fader from gone (0) through as-in-the-track
             (100) to twice as loud (200), and the readout. -->
        {#each FADERS as fader (fader.key)}
            <div class="flex h-5 items-center gap-x-2.5">
                <span class="rack-label w-[78px] shrink-0">{fader.label}</span>
                <div class="min-w-0 flex-1">
                    <CustomSlider
                        type="single"
                        min={0}
                        max={MIX_MAX * 100}
                        step={5}
                        origin={100}
                        value={percent(mix[fader.key])}
                        label={`${fader.label}: 0 is gone, 100 as in the track, 200 twice as loud`}
                        onValueChange={setFader(fader.key)}
                    />
                </div>
                <span
                    class="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-fg-2"
                >
                    {percent(mix[fader.key])}%
                </span>
            </div>
        {/each}
    </div>

    {#if error}
        <p class="text-[11px] text-alarm">{error}</p>
    {/if}
</div>
