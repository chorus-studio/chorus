<script lang="ts">
    // One upright fader of the graphic EQ: a native range input in vertical
    // writing mode, a lit fill rising from the bottom of the track and a glow
    // under the knob. The track is inset by half the knob so the fill's top and
    // the knob's centre meet at every value (EQControls draws its curve through
    // the same points).
    let {
        value,
        min = -12,
        max = 12,
        step = 0.5,
        label,
        valueText,
        onValueChange,
        onValueCommit
    }: {
        value: number
        min?: number
        max?: number
        step?: number
        label: string
        /** What assistive tech reads for the value, e.g. "+2.0 dB". */
        valueText?: string
        onValueChange: (value: number) => void
        /** Fired once a drag ends (or after a key press). */
        onValueCommit?: (value: number) => void
    } = $props()

    const level = $derived((value - min) / (max - min || 1))

    let last: number | undefined
    function handleInput(e: Event) {
        last = +(e.target as HTMLInputElement).value
        onValueChange(last)
    }
    function handleCommit() {
        if (last !== undefined) onValueCommit?.(last)
        last = undefined
    }
</script>

<div class="fader" style:--level={level}>
    <input
        type="range"
        {min}
        {max}
        {step}
        {value}
        aria-label={label}
        aria-valuetext={valueText}
        oninput={handleInput}
        onchange={handleCommit}
    />
</div>

<style>
    .fader {
        --thumb: 12px;
        --pad: calc(var(--thumb) / 2);
        --level: 0.5;
        position: relative;
        width: 100%;
        height: 100%;
    }

    /* track */
    .fader::before {
        content: '';
        position: absolute;
        left: 50%;
        top: var(--pad);
        bottom: var(--pad);
        width: 4px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: hsl(var(--ink-fg) / 0.12);
    }

    /* fill: darker at the foot, brightest just under the knob, with a glow */
    .fader::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: var(--pad);
        width: 4px;
        height: calc((100% - 2 * var(--pad)) * var(--level));
        transform: translateX(-50%);
        border-radius: 999px;
        background: linear-gradient(to top, hsl(var(--signal-dark)), hsl(var(--signal-bright)));
        box-shadow: 0 0 12px 1px hsl(var(--signal) / 0.4);
    }

    .fader input {
        -webkit-appearance: none;
        appearance: none;
        writing-mode: vertical-lr;
        direction: rtl;
        position: absolute;
        inset: 0;
        z-index: 1;
        width: 100%;
        height: 100%;
        margin: 0;
        background: none;
        outline: none;
        cursor: pointer;
    }
    .fader input::-moz-range-track {
        background: transparent;
    }

    /* Knob: the same outlined ring the horizontal sliders use, a size up.
       One rule per engine on purpose: a selector list with a pseudo-element the
       browser doesn't know is dropped wholesale. */
    .fader input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        box-sizing: border-box;
        width: var(--thumb);
        height: var(--thumb);
        border-radius: 50%;
        border: 1.5px solid hsl(var(--ink-fg));
        background: hsl(var(--ink));
        box-shadow: 0 0 0 0 hsl(var(--signal) / 0);
        transition:
            box-shadow 0.15s ease,
            transform 0.15s ease;
    }
    .fader input::-moz-range-thumb {
        appearance: none;
        box-sizing: border-box;
        width: var(--thumb);
        height: var(--thumb);
        border-radius: 50%;
        border: 1.5px solid hsl(var(--ink-fg));
        background: hsl(var(--ink));
        box-shadow: 0 0 0 0 hsl(var(--signal) / 0);
        transition:
            box-shadow 0.15s ease,
            transform 0.15s ease;
    }

    .fader input:hover::-webkit-slider-thumb,
    .fader input:active::-webkit-slider-thumb,
    .fader input:focus-visible::-webkit-slider-thumb {
        box-shadow: 0 0 0 4px hsl(var(--signal) / 0.3);
        transform: scale(1.08);
    }
    .fader input:hover::-moz-range-thumb,
    .fader input:active::-moz-range-thumb,
    .fader input:focus-visible::-moz-range-thumb {
        box-shadow: 0 0 0 4px hsl(var(--signal) / 0.3);
        transform: scale(1.08);
    }
</style>
