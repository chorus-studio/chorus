<script lang="ts">
    import { msParamsStore } from '$lib/stores/ms-params'
    import { Label } from '$lib/components/ui/label'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    let { pip = false }: { pip?: boolean } = $props()

    const modeOptions = [
        { label: 'bypass', value: '0' },
        { label: 'left-only', value: '1' },
        { label: 'right-only', value: '2' },
        { label: 'mid-only', value: '3' },
        { label: 'side-only', value: '4' },
        { label: 'width', value: '5' },
        { label: 'swap', value: '6' },
        { label: 'mono', value: '7' },
        { label: 'reverse-phase', value: '8' }
    ]

    const isWidthMode = $derived($msParamsStore.mode === 5)

    async function handleModeChange(value: string) {
        await msParamsStore.updateParam({ key: 'mode', value: parseInt(value) })
    }

    async function handleWidthChange(value: number) {
        await msParamsStore.updateParam({ key: 'width', value })
    }

    async function handleMidGainChange(value: number) {
        await msParamsStore.updateParam({ key: 'midGain', value })
    }

    async function handleSideGainChange(value: number) {
        await msParamsStore.updateParam({ key: 'sideGain', value })
    }

    async function handleBalanceChange(value: number) {
        await msParamsStore.updateParam({ key: 'balance', value })
    }
</script>

<div class="flex w-full flex-col gap-y-3">
    <!-- Mode Selector -->
    <div class="flex flex-col gap-y-1">
        <Label for="mode" class="text-sm text-gray-400">Processing Mode</Label>
        <CustomSelect
            {pip}
            size="md"
            key="ms-mode"
            selected={String($msParamsStore.mode)}
            options={modeOptions}
            onValueChange={handleModeChange}
        />
    </div>

    <!-- Width Control (only visible in width mode) -->
    {#if isWidthMode}
        <div class="flex flex-col gap-y-1">
            <div class="flex items-center justify-between">
                <Label for="width" class="text-sm text-gray-400">Stereo Width</Label>
                <span class="text-xs text-gray-500">{$msParamsStore.width}%</span>
            </div>
            <CustomSlider
                type="single"
                min={0}
                max={200}
                step={1}
                value={$msParamsStore.width}
                onValueChange={(value) => handleWidthChange(value as number)}
            />
        </div>
    {/if}

    <!-- Mid Gain Control -->
    <div class="flex flex-col gap-y-1">
        <div class="flex items-center justify-between">
            <Label for="mid-gain" class="text-sm text-gray-400">Mid Gain</Label>
            <span class="text-xs text-gray-500"
                >{$msParamsStore.midGain > 0 ? '+' : ''}{$msParamsStore.midGain.toFixed(1)} dB</span
            >
        </div>
        <CustomSlider
            type="single"
            min={-12}
            max={12}
            step={0.5}
            value={$msParamsStore.midGain}
            onValueChange={(value) => handleMidGainChange(value as number)}
        />
    </div>

    <!-- Side Gain Control -->
    <div class="flex flex-col gap-y-1">
        <div class="flex items-center justify-between">
            <Label for="side-gain" class="text-sm text-gray-400">Side Gain</Label>
            <span class="text-xs text-gray-500"
                >{$msParamsStore.sideGain > 0 ? '+' : ''}{$msParamsStore.sideGain.toFixed(
                    1
                )} dB</span
            >
        </div>
        <CustomSlider
            type="single"
            min={-12}
            max={12}
            step={0.5}
            value={$msParamsStore.sideGain}
            onValueChange={(value) => handleSideGainChange(value as number)}
        />
    </div>

    <!-- Balance Control -->
    <div class="flex flex-col gap-y-1">
        <div class="flex items-center justify-between">
            <Label for="balance" class="text-sm text-gray-400">Balance</Label>
            <span class="text-xs text-gray-500">
                {#if $msParamsStore.balance === 0}
                    Center
                {:else if $msParamsStore.balance < 0}
                    L {Math.abs($msParamsStore.balance)}
                {:else}
                    R {$msParamsStore.balance}
                {/if}
            </span>
        </div>
        <CustomSlider
            type="single"
            min={-100}
            max={100}
            step={1}
            value={$msParamsStore.balance}
            onValueChange={(value) => handleBalanceChange(value as number)}
        />
    </div>
</div>
