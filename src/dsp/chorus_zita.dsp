// Chorus zita reverb — mono-in / stereo-out wrapper around re.zita_rev1_stereo.
//
// re.zita_rev1_stereo is the classic Fons Adriaensen "zita-rev1" FDN reverb,
// stereo (2-in / 2-out). It has a native pre-delay (rdel, ms) but NO native
// dry/wet mix, so we add our own internal dry/wet crossfade. The node is
// MONO in -> STEREO out (the single input is fanned to both reverb inputs and
// also forms the dry signal copied to L and R).
//
// SMOOTHING POLICY (important — see gotcha below):
// re.zita_rev1_stereo derives internal FEEDBACK / FILTER coefficients from its
// arguments, which must be CONTROL-RATE CONSTANTS. Feeding them si.smoo-smoothed
// (audio-rate) signals makes the smoother ramp through intermediate values that
// momentarily yield a feedback gain > 1 -> the FDN tail diverges to NaN
// (reproducibly, ~block 36). So ONLY Dry_Wet (an audio-domain mix gain applied
// as a plain multiplier) is smoothed; the engine params are plain controls.
//
// re.zita_rev1_stereo signature (from reverbs.lib):
//   re.zita_rev1_stereo(rdel, f1, f2, t60dc, t60m, fsmax)
//   rdel  : pre-delay in milliseconds before the reverb onset
//   f1    : crossover frequency (Hz) between the DC and mid decay bands
//   f2    : transition frequency (Hz) above which decay rolls off to t60m
//   t60dc : decay time (s) at low frequencies (the t60 at DC)
//   t60m  : decay time (s) in the mid band (above f1)
//   fsmax : COMPILE-TIME max sample rate constant (here 48000)

import("stdfaust.lib");

// fsmax must be a constant expression at compile time.
fsmax = 48000.0;

// ---- Named parameters ------------------------------------------------------
// Dry_Wet is smoothed (audio-domain mix gain). Engine params are plain controls.
Dry_Wet   = hslider("Dry_Wet[style:knob]",            0.5, 0,   1,    0.001) : si.smoo;
PreDelay  = hslider("PreDelay[unit:ms][style:knob]",  20,  0,   100,  0.1);
Low_Xover = hslider("Low_Xover[unit:Hz][style:knob]", 200, 50,  1000, 1);
HF_Damp   = hslider("HF_Damp[unit:Hz][style:knob]",   6000, 1500, 23520, 1);
Decay_Low = hslider("Decay_Low[unit:s][style:knob]",  3.0, 0.1, 10,   0.01);
Decay_Mid = hslider("Decay_Mid[unit:s][style:knob]",  2.0, 0.1, 10,   0.01);

// ---- Wet engine: stereo zita-rev1 fed from the mono input -----------------
wet = re.zita_rev1_stereo(PreDelay, Low_Xover, HF_Damp, Decay_Low, Decay_Mid, fsmax);

// ---- Mono-in / stereo-out dry/wet crossfade -------------------------------
// Single reverb instance (see chorus_jpverb.dsp for why `!`-cut copies desync an
// FDN). Fan the mono input to 4 rails [dryL, dryR, x, x]; apply `wet` to the last
// two; crossfade per channel.
process = (_ <: (_, _, _, _) : (_, _, wet) : crossfade)
with {
    dryGain = 1 - Dry_Wet;
    wetGain = Dry_Wet;
    // crossfade(dryL, dryR, wetL, wetR) -> (outL, outR)
    crossfade(dL, dR, wL, wR) = dL * dryGain + wL * wetGain,
                                dR * dryGain + wR * wetGain;
};
