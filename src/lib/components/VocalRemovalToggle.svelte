<script lang="ts">
    import { onDestroy, onMount } from 'svelte'
    import { Switch } from '$lib/components/ui/switch'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import ToggleSelect from '$lib/components/ToggleSelect.svelte'

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

    function setMode(value: string | undefined) {
        if (value !== 'remove' && value !== 'isolate') return // ignore deselect
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

<div class="flex w-full flex-col gap-y-3 pt-1">
    <div class="flex items-center justify-between">
        <span class="text-sm text-gray-300">vocal separation</span>
        <Switch checked={on} onCheckedChange={toggle} />
    </div>

    <div
        inert={!on}
        class="flex flex-col gap-y-3 transition-opacity duration-150 {on
            ? ''
            : 'pointer-events-none opacity-40'}"
    >
        <ToggleSelect
            label={mode === 'remove' ? 'Instrumental' : 'Acapella'}
            labelClass="text-sm"
            value={mode}
            onValueChange={setMode}
            list={[
                { label: 'I', value: 'remove' },
                { label: 'A', value: 'isolate' }
            ]}
        />

        <div class="flex flex-col gap-y-1">
            <div class="flex items-center justify-between">
                <span class="text-sm text-gray-400">strength</span>
                <span class="text-xs text-gray-500">{depth}%</span>
            </div>
            <CustomSlider type="single" min={0} max={100} step={1} value={depth} onValueChange={setDepth} />
            <div class="flex items-center justify-between text-[10px] text-gray-500">
                <span>original</span>
                <span>full</span>
            </div>
        </div>
    </div>

    {#if error}
        <p class="text-xs text-red-400">{error}</p>
    {/if}
</div>
