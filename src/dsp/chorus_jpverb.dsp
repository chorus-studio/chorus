// Chorus jpverb reverb — mono-in / stereo-out wrapper around re.jpverb.
//
// re.jpverb is a stereo (2-in / 2-out) algorithmic reverb. It is PURE WET: it
// has no native dry/wet mix and no pre-delay. We add our own internal dry/wet
// crossfade so the host node is a single self-contained reverb.
//
// Node shape: MONO in -> STEREO out.
//   - The single input is fanned out to both reverb input channels.
//   - The dry signal is the same mono input copied to L and R.
//
// SMOOTHING POLICY (important — see gotcha below):
// re.jpverb derives internal FEEDBACK / FILTER coefficients from its arguments.
// Those arguments must be CONTROL-RATE CONSTANTS. Feeding them an si.smoo-
// smoothed (audio-rate, time-varying) signal makes the smoother ramp through
// intermediate values that momentarily produce a feedback gain > 1 in the
// recursive FDN -> the tail diverges to NaN (reproducibly, ~block 36). So:
//   - Dry_Wet (an audio-domain MIX gain, applied as a plain multiplier) IS
//     smoothed with si.smoo — that's the main zipper-noise source and it's safe.
//   - The reverb/engine params are PLAIN controls (no si.smoo). They feed
//     coefficient math, change smoothly inside the engine already, and DON'T
//     cause audible zipper noise the way a raw gain does. Smoothing them = NaN.
//
// re.jpverb signature (from reverbs.lib):
//   re.jpverb(t60, damp, size, early, moddepth, modfreq, low, mid, high,
//             low_cutoff, high_cutoff)
//   t60        : approx reverberation time (decay) in seconds
//   damp       : HF damping of the tail (0..1)
//   size       : scales room size / delay-line lengths (0.5..5)
//   early      : early-vs-late diffusion balance (0..1)
//   moddepth   : chorusing modulation depth (0..1)
//   modfreq    : chorusing modulation frequency in Hz (0..10)
//   low/mid/high : multipliers for the low / mid / high decay bands (0..1)
//   low_cutoff : low/mid crossover frequency in Hz
//   high_cutoff: mid/high crossover frequency in Hz

import("stdfaust.lib");

// ---- Named parameters ------------------------------------------------------
// Dry_Wet is smoothed (audio-domain mix gain). Engine params are plain controls.
Dry_Wet     = hslider("Dry_Wet[style:knob]",      0.5,  0,    1,    0.001) : si.smoo;
Decay       = hslider("Decay[unit:s][style:knob]", 3.0,  0.1,  30,   0.01);
Damping     = hslider("Damping[style:knob]",       0.5,  0,    1,    0.001);
Size        = hslider("Size[style:knob]",          1.0,  0.5,  5,    0.01);
Early_Diff  = hslider("Early_Diff[style:knob]",    0.7,  0,    1,    0.001);
Mod_Depth   = hslider("Mod_Depth[style:knob]",     0.1,  0,    1,    0.001);
Mod_Freq    = hslider("Mod_Freq[unit:Hz][style:knob]", 2.0, 0, 10,  0.01);
Low_Decay   = hslider("Low_Decay[style:knob]",     0.5,  0,    1,    0.001);
Mid_Decay   = hslider("Mid_Decay[style:knob]",     0.5,  0,    1,    0.001);
High_Decay  = hslider("High_Decay[style:knob]",    0.5,  0,    1,    0.001);
Low_Cutoff  = hslider("Low_Cutoff[unit:Hz][style:knob]",  500, 100, 6000,  1);
High_Cutoff = hslider("High_Cutoff[unit:Hz][style:knob]", 3000, 1000, 12000, 1);

// ---- Wet engine: stereo reverb fed from the mono input --------------------
// jpverb takes 2 inputs; fan the single mono input out to both.
wet = re.jpverb(Decay, Damping, Size, Early_Diff, Mod_Depth, Mod_Freq,
                Low_Decay, Mid_Decay, High_Decay, Low_Cutoff, High_Cutoff);

// ---- Mono-in / stereo-out dry/wet crossfade -------------------------------
// One mono input is fanned into 4 rails: dryL, dryR, and the stereo reverb's two
// inputs (both fed the same mono signal). The reverb is instantiated EXACTLY
// ONCE — routing its two outputs through `!`-cut copies would re-instantiate the
// recursive FDN and desync its delay lines (producing NaNs), so we keep a single
// instance and crossfade per channel.
//   in  -> [dry, dry, x, x]
//   wet : (x, x) -> (wetL, wetR)
//   out :  dryGain*dry (L) + wetGain*wetL  ,  dryGain*dry (R) + wetGain*wetR
// `with{}` must attach to a parenthesized expression, hence the wrapping `()`.
process = (_ <: (_, _, _, _) : (_, _, wet) : crossfade)
with {
    dryGain = 1 - Dry_Wet;
    wetGain = Dry_Wet;
    // After fan-out + wet we have 4 rails: dryL, dryR, wetL, wetR.
    //   (_, _, wet) passes rails 1,2 (dry L/R) and applies the SINGLE wet
    //   reverb instance to rails 3,4.
    // crossfade(dryL, dryR, wetL, wetR) -> (outL, outR)
    crossfade(dL, dR, wL, wR) = dL * dryGain + wL * wetGain,
                                dR * dryGain + wR * wetGain;
};
