<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { Switch } from '$lib/components/ui/switch'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    let on = $state(false)
    let mode = $state<'remove' | 'isolate'>('remove')
    let depth = $state(100)
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
                // running after the popup closes). Ignore it once the user has toggled,
                // so a late reply can't clobber their fresh choice.
                if (userActed) return
                on = !!msg.capturing
                if (msg.mode === 'remove' || msg.mode === 'isolate') mode = msg.mode
                if (typeof msg.depth === 'number') depth = Math.round(msg.depth * 100)
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
            if (checked) {
                // Carry mode+depth with start so they apply even when no offscreen doc
                // exists yet for a separate setMode/setDepth relay to land on.
                p.postMessage({ cmd: 'start', mode, depth: depth / 100 })
            } else {
                p.postMessage({ cmd: 'stop' })
            }
        } catch (e) {
            error = e instanceof Error ? e.message : String(e)
            on = false
        }
    }

    // ensurePort reconnects if the service worker bounced, so a mid-session
    // param change isn't silently dropped into a dead port.
    function send(msg: unknown) {
        try {
            ensurePort().postMessage(msg)
        } catch (e) {
            error = e instanceof Error ? e.message : String(e)
        }
    }

    function setMode(value: string) {
        if (value !== 'remove' && value !== 'isolate') return
        mode = value
        if (on) send({ cmd: 'setMode', mode })
    }

    function setDepth(value: number | number[]) {
        depth = Array.isArray(value) ? value[0] : value
        if (on) send({ cmd: 'setDepth', depth: depth / 100 })
    }

    onMount(() => {
        // Ask what's actually running so the switch reflects reality on open.
        ensurePort().postMessage({ cmd: 'getState' })
    })

    onDestroy(() => {
        port?.disconnect()
        port = null
    })
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
        <SegmentedControl
            grow
            size="sm"
            ariaLabel="Mode"
            value={mode}
            onValueChange={setMode}
            options={[
                { label: 'Instrumental', value: 'remove', title: 'Remove the vocals' },
                { label: 'Acapella', value: 'isolate', title: 'Keep only the vocals' }
            ]}
        />

        <div class="flex flex-col gap-y-1.5">
            <div class="flex items-center justify-between">
                <span class="rack-label">Strength</span>
                <span class="font-mono text-[11px] text-ink-fg-2">{depth}%</span>
            </div>
            <CustomSlider
                type="single"
                min={0}
                max={100}
                step={1}
                value={depth}
                label="Strength"
                onValueChange={setDepth}
            />
            <div class="flex items-center justify-between font-mono text-[9px] text-ink-muted">
                <span>original</span>
                <span>full</span>
            </div>
        </div>
    </div>

    {#if error}
        <p class="text-[11px] text-alarm">{error}</p>
    {/if}
</div>
