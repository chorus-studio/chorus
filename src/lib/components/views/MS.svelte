<script lang="ts">
    // The Stereo tab's Presets half: the channel modes as one row of chips (six
    // of them, one tap each, the lit one again for plain stereo) and the stereo
    // processing presets in a picker with its recents, like Reverb and EQ.
    import { effectsStore } from '$lib/stores/effects'
    import { configStore } from '$lib/stores/config'
    import Info from '@lucide/svelte/icons/info'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import BadgeList from '$lib/components/BadgeList.svelte'
    import RecentChips from '$lib/components/RecentChips.svelte'

    import { basicPresets, advancedPresets } from '$lib/audio-effects/ms-processor/presets'

    let { pip = false }: { pip?: boolean } = $props()

    const hidden = $derived($configStore.fx_eq_presets.ms_processor_presets ?? [])
    const modes = $derived(basicPresets.filter((preset) => !hidden.includes(preset)))
    const processingOptions = $derived(
        ['none', ...advancedPresets]
            .filter((preset) => !hidden.includes(preset))
            .map((preset) => ({ label: preset, value: preset }))
    )

    const current = $derived($effectsStore.msProcessor)
    const modeOn = $derived(basicPresets.includes(current))

    const apply = (value: string) =>
        effectsStore.updateEffect({ key: 'msProcessor', value: value === current ? 'none' : value })
    const label = (value: string) => value.replace('-', ' ')
</script>

<div class="flex h-full flex-col gap-y-3">
    <div class="flex flex-col gap-y-1 rounded-lg border border-hairline bg-panel px-2.5 py-1">
        <div class="flex h-4 items-center justify-between gap-x-3">
            <span class="rack-label shrink-0">Channel</span>
            <span class="truncate text-[11px] text-ink-muted"
                >One tap; the lit one again for stereo</span
            >
        </div>
        <div class="flex min-h-11 items-start">
            <BadgeList
                list={modes}
                current={modeOn ? current : undefined}
                format={label}
                wrap
                handleSelect={apply}
            />
        </div>
    </div>

    <div class="flex flex-col gap-y-1 rounded-lg border border-hairline bg-panel px-2.5 py-1">
        <div class="flex h-4 items-center justify-between gap-x-3">
            <span class="rack-label shrink-0">Stereo processing</span>
            <span class="truncate text-[11px] text-ink-muted"
                >Width, and mid/side mixes for practice</span
            >
        </div>
        <CustomSelect
            {pip}
            size="sm"
            key="msProcessor-bottom"
            selected={modeOn ? 'none' : current}
            options={processingOptions}
            onValueChange={apply}
            class="w-full"
        />
        <RecentChips list="ms_processing" allowed={processingOptions.map((o) => o.value)} />
    </div>

    <p class="mt-auto flex items-center gap-x-1.5 text-[11px] text-ink-muted">
        <Info class="size-3 shrink-0" />
        Best heard on headphones.
    </p>
</div>
