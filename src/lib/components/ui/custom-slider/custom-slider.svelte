<script lang="ts">
    let {
        type = 'single',
        values = [50, 75],
        min = 0,
        max = 100,
        step = 1,
        onValueChange
    }: {
        type: 'single' | 'multiple'
        values: number[]
        min: number
        max: number
        step: number
        onValueChange: (vals: number[]) => void
    } = $props()

    let sliderElement: HTMLElement
    let leftInput: HTMLInputElement
    let rightInput: HTMLInputElement

    // Calculate initial percentages
    $effect(() => {
        const range = max - min
        if (sliderElement && leftInput) {
            if (type === 'single') {
                const percent = ((values[0] - min) / range) * 100
                sliderElement.style.setProperty('--start', '0%')
                sliderElement.style.setProperty('--stop', `${percent}%`)
                leftInput.value = values[0].toString()
            } else {
                const startPercent = ((Math.min(values[0], values[1]) - min) / range) * 100
                const stopPercent = ((Math.max(values[0], values[1]) - min) / range) * 100
                sliderElement.style.setProperty('--start', `${startPercent}%`)
                sliderElement.style.setProperty('--stop', `${stopPercent}%`)
                leftInput.value = values[0].toString()
                if (rightInput) {
                    rightInput.value = values[1].toString()
                }
            }
        }
    })

    function handleValueChange(e: Event) {
        const target = e.target as HTMLInputElement
        const value = +target.value
        const index = +(target.dataset.index ?? '0')
        const next = [...values]
        next[index] = value
        onValueChange(next)

        // Calculate percentages for CSS variables
        const range = max - min
        if (type === 'single') {
            const percent = ((value - min) / range) * 100
            const slider = target.closest('.slider') as HTMLElement
            if (slider) {
                slider.style.setProperty('--start', '0%')
                slider.style.setProperty('--stop', `${percent}%`)
            }
        } else {
            const startPercent = ((Math.min(...next) - min) / range) * 100
            const stopPercent = ((Math.max(...next) - min) / range) * 100
            const slider = target.closest('.slider') as HTMLElement
            if (slider) {
                slider.style.setProperty('--start', `${startPercent}%`)
                slider.style.setProperty('--stop', `${stopPercent}%`)
            }
        }
    }
</script>

<div class="slider relative flex w-full items-center" bind:this={sliderElement}>
    <input
        bind:this={leftInput}
        type="range"
        data-index="0"
        oninput={handleValueChange}
        value={values[0]}
        {max}
        {min}
        {step}
    />
    {#if type === 'multiple'}
        <input
            bind:this={rightInput}
            type="range"
            data-index="1"
            oninput={handleValueChange}
            value={values[1]}
            {max}
            {min}
            {step}
        />
    {/if}
</div>

<style>
    .slider {
        position: relative;
        height: 4px;
        background: #e5e7eb;
    }

    .slider input {
        --start: 0%;
        --stop: 100%;
        -webkit-appearance: none;
        appearance: none;
        background: none;
        pointer-events: none;
        position: absolute;
        height: 4px;
        width: 100%;
    }

    .slider::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(
            to right,
            #e5e7eb var(--start),
            #22c55e var(--start),
            #22c55e var(--stop),
            #e5e7eb var(--stop)
        );
    }

    .slider ::-moz-range-thumb {
        cursor: pointer;
        pointer-events: auto;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 0 0 4px #22c55e;
        -webkit-appearance: none;
        appearance: none;
        margin-top: -2px;
    }

    .slider ::-webkit-slider-thumb {
        cursor: pointer;
        pointer-events: auto;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 0 0 4px #22c55e;
        -webkit-appearance: none;
        appearance: none;
        margin-top: -2px;
    }
</style>
