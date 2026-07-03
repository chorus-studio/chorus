<script lang="ts">
    import FX from './FX.svelte'
    import ReverbControls from '$lib/components/ReverbControls.svelte'
    import { effectsStore } from '$lib/stores/effects'
    import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'

    let { pip = false }: { pip?: boolean } = $props()

    let sub = $state<'presets' | 'config'>('presets')

    const subTabs = [
        { id: 'presets', label: 'presets' },
        { id: 'config', label: 'config' }
    ] as const

    // What the config is starting from: the last-loaded user preset, else the
    // active built-in preset, else the engine defaults.
    let userFrom = $state('')

    // Picking a built-in preset supersedes a previously-loaded user preset.
    $effect(() => {
        void $effectsStore.reverb
        userFrom = ''
    })
    const fromLabel = $derived.by(() => {
        if (userFrom) return userFrom
        const active = resolveReverbPreset($effectsStore.reverb)
        return active && active !== 'none' ? active : 'default'
    })
</script>

<div class="flex h-full w-full flex-col gap-y-2">
    <div class="flex items-center justify-between gap-x-2">
        <div class="flex min-w-0 flex-1 items-center gap-x-1.5">
            {#if sub === 'config'}
                <span class="truncate text-xs text-gray-500"
                    >from: <span class="text-gray-400">{fromLabel}</span></span
                >
            {/if}
        </div>

        <div class="flex shrink-0 items-center gap-x-1.5">
            {#each subTabs as t (t.id)}
                <button
                    onclick={() => (sub = t.id)}
                    class="rounded-[2px] px-1.5 py-0 pb-[0.125rem] text-sm font-semibold leading-[18px] text-[#fafafa] transition-colors {sub ===
                    t.id
                        ? 'bg-green-700 hover:bg-green-800'
                        : 'bg-zinc-700 hover:bg-zinc-500'}"
                >
                    {t.label}
                </button>
            {/each}
        </div>
    </div>

    {#if sub === 'presets'}
        <FX {pip} />
    {:else}
        <ReverbControls {pip} onUserPresetLoad={(name) => (userFrom = name)} />
    {/if}
</div>
