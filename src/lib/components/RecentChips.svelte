<script lang="ts">
    // Pinned and recently used presets of one picker list, as chips under it:
    // tap to apply (tap the lit one to switch the effect off), star to keep it
    // in the row as new picks arrive. Always two rows tall so the card never
    // jumps as chips come and go.
    import { effectsStore } from '$lib/stores/effects'
    import {
        effectFrequents,
        LIST_KIND,
        type EffectFrequent,
        type EffectList
    } from '$lib/stores/effect-frequents'
    import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'
    import BadgeList from '$lib/components/BadgeList.svelte'

    let { list, allowed }: { list: EffectList; allowed: string[] } = $props()

    const kind = $derived(LIST_KIND[list])
    // A preset hidden under Settings leaves the row as well.
    const chips = $derived($effectFrequents[list].filter((f) => allowed.includes(f.value)))
    const current = $derived(
        kind === 'reverb' ? resolveReverbPreset($effectsStore.reverb) : $effectsStore.equalizer
    )

    function select(value: string) {
        void effectsStore.updateEffect({ key: kind, value: value === current ? 'none' : value })
    }
    const pin = (item: EffectFrequent) => effectFrequents.togglePin(list, item.value)
</script>

<div class="flex min-h-11 items-start">
    {#if chips.length}
        <BadgeList list={chips} {current} wrap handleSelect={select} handlePin={pin} />
    {:else}
        <span class="text-[11px] text-ink-muted">Presets you pick show up here.</span>
    {/if}
</div>
