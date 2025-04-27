<script lang="ts">
    let {
        type = 'single',
        value,
        min = 0,
        max = 100,
        step = 1,
        onValueChange
    }: {
        type: 'single' | 'multiple'
        value: number | number[]
        min: number
        max: number
        step: number
        onValueChange: (value: number | number[]) => void
    } = $props()

    let sliderElement: HTMLElement
    let leftInput: HTMLInputElement
    let rightInput: HTMLInputElement | null = $state(null)

    // Calculate initial percentages
    $effect(() => {
        const range = max - min
        if (sliderElement && leftInput) {
            if (type === 'single') {
                let currentValue = value as number
                const percent = ((currentValue - min) / range) * 100
                sliderElement.style.setProperty('--start', '0%')
                sliderElement.style.setProperty('--stop', `${percent}%`)
                leftInput.value = currentValue.toString()
            } else if (type === 'multiple' && rightInput) {
                let currentValue = value as number[]
                const startPercent =
                    ((Math.min(currentValue[0], currentValue[1]) - min) / range) * 100
                const stopPercent =
                    ((Math.max(currentValue[0], currentValue[1]) - min) / range) * 100
                sliderElement.style.setProperty('--start', `${startPercent}%`)
                sliderElement.style.setProperty('--stop', `${stopPercent}%`)
                leftInput.value = Math.min(currentValue[0], currentValue[1]).toString()
                rightInput.value = Math.max(currentValue[0], currentValue[1]).toString()
            }
        }
    })

    function handleValueChange(e: Event) {
        const target = e.target as HTMLInputElement
        const newValue = +target.value
        const index = +(target.dataset.index ?? '0')
        let next
        if (type === 'multiple') {
            next = [...(value as number[])]

            // Prevent crossing by constraining the values
            if (index === 0) {
                // Left thumb - cannot go beyond right thumb
                next[0] = Math.min(newValue, next[1])
                // Update the input value to reflect the constraint
                target.value = next[0].toString()
            } else {
                // Right thumb - cannot go below left thumb
                next[1] = Math.max(newValue, next[0])
                // Update the input value to reflect the constraint
                target.value = next[1].toString()
            }
        }
        onValueChange(next ?? newValue)

        // Calculate percentages for CSS variables
        const range = max - min
        if (type === 'single') {
            const percent = ((newValue - min) / range) * 100
            const slider = target.closest('.slider') as HTMLElement
            if (slider) {
                slider.style.setProperty('--start', '0%')
                slider.style.setProperty('--stop', `${percent}%`)
            }
        } else if (type === 'multiple' && next) {
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
        {max}
        {min}
        {step}
        type="range"
        data-index="0"
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
            bind:this={rightInput}
            oninput={handleValueChange}
            value={Array.isArray(value) ? value[1] : value}
        />
    {/if}
</div>

<style>
    .slider {
        position: relative;
        height: 4px;
        background: #fafafa33;
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
            #fafafa33 var(--start),
            #22c55e var(--start),
            #22c55e var(--stop),
            #fafafa33 var(--stop)
        );
    }

    /* Default state - no box-shadow */
    .slider ::-moz-range-thumb {
        cursor: pointer;
        pointer-events: auto;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: white;
        -webkit-appearance: none;
        appearance: none;
        margin-top: -1px;
        box-shadow: none;
        transition: box-shadow 0.2s ease;
    }

    /* Hover state */
    .slider ::-moz-range-thumb:hover {
        box-shadow: 0 0 0 3px #22c55e;
    }

    /* Active/focus state */
    .slider ::-moz-range-thumb:active,
    .slider ::-moz-range-thumb:focus {
        box-shadow: 0 0 0 3px #22c55e;
        outline: none;
    }

    /* Default state - no box-shadow */
    .slider ::-webkit-slider-thumb {
        cursor: pointer;
        pointer-events: auto;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: white;
        -webkit-appearance: none;
        appearance: none;
        margin-top: -1px;
        box-shadow: none;
        transition: box-shadow 0.2s ease;
    }

    /* Hover state */
    .slider ::-webkit-slider-thumb:hover {
        box-shadow: 0 0 0 3px #22c55e;
    }

    /* Active/focus state */
    .slider ::-webkit-slider-thumb:active,
    .slider ::-webkit-slider-thumb:focus {
        box-shadow: 0 0 0 3px #22c55e;
        outline: none;
    }
</style>
