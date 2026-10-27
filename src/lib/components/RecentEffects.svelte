<script lang="ts">
    // Pinned and recently used presets of one effect, as chips under the
    // pickers: tap to apply (tap the lit one to switch the effect off), star
    // to keep it in the row as new picks arrive.
    import { effectsStore } from '$lib/stores/effects'
    import {
        effectFrequents,
        type EffectFrequent,
        type EffectKind
    } from '$lib/stores/effect-frequents'
    import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'
    import BadgeList from '$lib/components/BadgeList.svelte'

    let { kind, allowed }: { kind: EffectKind; allowed: string[] } = $props()

    // A preset hidden under Settings leaves the row as well.
    const list = $derived($effectFrequents[kind].filter((f) => allowed.includes(f.value)))
    const current = $derived(
        kind === 'reverb' ? resolveReverbPreset($effectsStore.reverb) : $effectsStore.equalizer
    )

    function select(value: string) {
        void effectsStore.updateEffect({ key: kind, value: value === current ? 'none' : value })
    }
    const pin = (item: EffectFrequent) => effectFrequents.togglePin(kind, item.value)
</script>

<div class="flex flex-col gap-y-1 rounded-lg border border-hairline bg-panel px-2.5 py-1.5">
    <div class="flex h-4 items-center justify-between gap-x-3">
        <span class="rack-label shrink-0">Recent</span>
        <span class="truncate text-[11px] text-ink-muted">Tap to apply · star to keep</span>
    </div>
    {#if list.length}
        <BadgeList {list} {current} wrap handleSelect={select} handlePin={pin} />
    {:else}
        <span class="text-[11px] text-ink-muted">Presets you pick show up here.</span>
    {/if}
</div>
