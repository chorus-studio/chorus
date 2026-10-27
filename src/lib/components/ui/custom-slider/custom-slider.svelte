<script lang="ts">
    let {
        type = 'single',
        value,
        min = 0,
        max = 100,
        step = 1,
        label = 'slider',
        disabled = false,
        onValueChange,
        onValueCommit
    }: {
        type: 'single' | 'multiple'
        value: number | number[]
        min: number
        max: number
        step: number
        label?: string
        /** Greys the slider out and ignores input; the fill keeps showing the value. */
        disabled?: boolean
        onValueChange: (value: number | number[]) => void
        /** Fired once a drag ends (or after a key press), for work too costly per input event. */
        onValueCommit?: (value: number | number[]) => void
    } = $props()

    let sliderElement: HTMLElement
    let leftInput: HTMLInputElement
    let rightInput: HTMLInputElement | null = $state(null)

    // Which input owns clicks on the bare track, so a click anywhere jumps the
    // value and the native drag carries on from there (thumbs stay grabbable on
    // their own). A single slider's only input always does; a range slider hands
    // the track to whichever thumb is nearer the pointer.
    let trackOwner = $state(0)

    function pickTrackOwner(e: PointerEvent) {
        if (type !== 'multiple' || e.buttons !== 0 || !sliderElement) return
        const rect = sliderElement.getBoundingClientRect()
        if (rect.width === 0) return
        const [a, b] = value as number[]
        const lo = Math.min(a, b)
        const hi = Math.max(a, b)
        const at = min + ((e.clientX - rect.left) / rect.width) * (max - min)
        const dLo = Math.abs(at - lo)
        const dHi = Math.abs(at - hi)
        trackOwner = dLo < dHi ? 0 : dHi < dLo ? 1 : at <= lo ? 0 : 1
    }

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

    // What the last input event settled on, so a commit reports the same value.
    let lastValue: number | number[] | undefined

    function handleCommit() {
        if (lastValue !== undefined) onValueCommit?.(lastValue)
        lastValue = undefined
    }

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
        lastValue = next ?? newValue
        onValueChange(lastValue)

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

<div
    class="slider relative flex w-full items-center"
    class:disabled
    bind:this={sliderElement}
    onpointermove={pickTrackOwner}
>
    <input
        {max}
        {min}
        {step}
        {disabled}
        type="range"
        data-index="0"
        aria-label={type === 'multiple' ? `${label} start` : label}
        class:owns-track={trackOwner === 0}
        bind:this={leftInput}
        oninput={handleValueChange}
        onchange={handleCommit}
        value={Array.isArray(value) ? value[0] : value}
    />
    {#if type === 'multiple'}
        <input
            {max}
            {min}
            {step}
            {disabled}
            type="range"
            data-index="1"
            aria-label={`${label} end`}
            class:owns-track={trackOwner === 1}
            bind:this={rightInput}
            oninput={handleValueChange}
            onchange={handleCommit}
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
    .slider input.owns-track {
        pointer-events: auto;
        z-index: 1;
    }

    /* Off: the fill goes grey and the thumb hollow, but the value stays readable. */
    .slider.disabled::before {
        background: linear-gradient(
            to right,
            hsl(var(--ink-fg) / 0.1) var(--start),
            hsl(var(--ink-fg) / 0.28) var(--start),
            hsl(var(--ink-fg) / 0.28) var(--stop),
            hsl(var(--ink-fg) / 0.1) var(--stop)
        );
    }
    .slider input:disabled {
        pointer-events: none;
    }
    .slider input:disabled::-webkit-slider-thumb {
        cursor: default;
        border-color: hsl(var(--ink-fg) / 0.4);
        background: hsl(var(--ink));
    }
    .slider input:disabled::-moz-range-thumb {
        cursor: default;
        border-color: hsl(var(--ink-fg) / 0.4);
        background: hsl(var(--ink));
    }

    .slider input::-moz-range-track {
        background: transparent;
        height: 16px;
    }

    /* Thumb: a small outlined ring on the track. Each engine's pseudo-element
       gets its own rule on purpose: a selector list that contains one the
       browser doesn't recognise is dropped wholesale, which left Chrome with
       its default thumb and `pointer-events: none` inherited from the input. */
    .slider input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        pointer-events: auto;
        cursor: pointer;
        box-sizing: border-box;
        width: 10px;
        height: 10px;
        margin-top: 0;
        border-radius: 50%;
        border: 1.5px solid hsl(var(--ink-fg));
        background: hsl(var(--ink));
        box-shadow: 0 0 0 0 hsl(var(--signal) / 0);
        transition:
            box-shadow 0.15s ease,
            transform 0.15s ease;
    }
    .slider input::-moz-range-thumb {
        appearance: none;
        pointer-events: auto;
        cursor: pointer;
        box-sizing: border-box;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 1.5px solid hsl(var(--ink-fg));
        background: hsl(var(--ink));
        box-shadow: 0 0 0 0 hsl(var(--signal) / 0);
        transition:
            box-shadow 0.15s ease,
            transform 0.15s ease;
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
