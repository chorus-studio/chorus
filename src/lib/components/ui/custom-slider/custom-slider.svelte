<script lang="ts">
    let {
        type = 'single',
        value,
        min = 0,
        max = 100,
        step = 1,
        label = 'slider',
        onValueChange
    }: {
        type: 'single' | 'multiple'
        value: number | number[]
        min: number
        max: number
        step: number
        label?: string
        onValueChange: (value: number | number[]) => void
    } = $props()

    let sliderElement: HTMLElement
    let leftInput: HTMLInputElement
    let rightInput: HTMLInputElement | null = $state(null)

    // Keep the fill (--start/--stop) and the native inputs in sync with `value`.
    $effect(() => {
        const range = max - min || 1
        if (sliderElement && leftInput) {
            if (type === 'single') {
                const currentValue = value as number
                const percent = ((currentValue - min) / range) * 100
                sliderElement.style.setProperty('--start', '0%')
                sliderElement.style.setProperty('--stop', `${percent}%`)
                leftInput.value = currentValue.toString()
            } else if (type === 'multiple' && rightInput) {
                const currentValue = value as number[]
                const lo = Math.min(currentValue[0], currentValue[1])
                const hi = Math.max(currentValue[0], currentValue[1])
                sliderElement.style.setProperty('--start', `${((lo - min) / range) * 100}%`)
                sliderElement.style.setProperty('--stop', `${((hi - min) / range) * 100}%`)
                leftInput.value = lo.toString()
                rightInput.value = hi.toString()
            }
        }
    })

    function handleValueChange(e: Event) {
        const target = e.target as HTMLInputElement
        const newValue = +target.value
        const index = +(target.dataset.index ?? '0')
        let next: number[] | undefined
        if (type === 'multiple') {
            next = [...(value as number[])]
            // Thumbs may not cross.
            if (index === 0) {
                next[0] = Math.min(newValue, next[1])
                target.value = next[0].toString()
            } else {
                next[1] = Math.max(newValue, next[0])
                target.value = next[1].toString()
            }
        }
        onValueChange(next ?? newValue)

        const range = max - min || 1
        const slider = target.closest('.slider') as HTMLElement
        if (!slider) return
        if (type === 'single') {
            slider.style.setProperty('--start', '0%')
            slider.style.setProperty('--stop', `${((newValue - min) / range) * 100}%`)
        } else if (next) {
            slider.style.setProperty('--start', `${((Math.min(...next) - min) / range) * 100}%`)
            slider.style.setProperty('--stop', `${((Math.max(...next) - min) / range) * 100}%`)
        }
    }
</script>

<div class="slider relative flex w-full items-center" bind:this={sliderElement}>
    <input
        {max}
        {min}
        {step}
        type="range"
        data-index="0"
        aria-label={type === 'multiple' ? `${label} start` : label}
        bind:this={leftInput}
        oninput={handleValueChange}
        value={Array.isArray(value) ? value[0] : value}
    />
    {#if type === 'multiple'}
        <input
            {max}
            {min}
            {step}
            type="range"
            data-index="1"
            aria-label={`${label} end`}
            bind:this={rightInput}
            oninput={handleValueChange}
            value={Array.isArray(value) ? value[1] : value}
        />
    {/if}
</div>

<style>
    .slider {
        --start: 0%;
        --stop: 100%;
        height: 16px;
    }

    /* track */
    .slider::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 4px;
        transform: translateY(-50%);
        border-radius: 999px;
        background: linear-gradient(
            to right,
            hsl(var(--ink-fg) / 0.14) var(--start),
            hsl(var(--signal)) var(--start),
            hsl(var(--signal)) var(--stop),
            hsl(var(--ink-fg) / 0.14) var(--stop)
        );
    }

    .slider input {
        -webkit-appearance: none;
        appearance: none;
        background: none;
        pointer-events: none;
        position: absolute;
        top: 0;
        left: 0;
        height: 16px;
        width: 100%;
        margin: 0;
        outline: none;
    }

    .slider input::-moz-range-track {
        background: transparent;
        height: 16px;
    }

    .slider input::-moz-range-thumb,
    .slider input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        pointer-events: auto;
        cursor: pointer;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid hsl(var(--ink));
        background: hsl(var(--ink-fg));
        box-shadow: 0 0 0 0 hsl(var(--signal) / 0);
        transition:
            box-shadow 0.15s ease,
            transform 0.15s ease;
    }
    .slider input::-webkit-slider-thumb {
        margin-top: 0;
    }

    .slider input:hover::-webkit-slider-thumb,
    .slider input:active::-webkit-slider-thumb,
    .slider input:focus-visible::-webkit-slider-thumb {
        box-shadow: 0 0 0 4px hsl(var(--signal) / 0.3);
        transform: scale(1.08);
    }
    .slider input:hover::-moz-range-thumb,
    .slider input:active::-moz-range-thumb,
    .slider input:focus-visible::-moz-range-thumb {
        box-shadow: 0 0 0 4px hsl(var(--signal) / 0.3);
        transform: scale(1.08);
    }
</style>
