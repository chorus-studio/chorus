import { writable } from 'svelte/store'

// Which sub-view the fx/eq tabs are showing. ActionButtons' reset uses this for
// context-sensitive semantics:
//   presets view -> clear the effect (off) + flatten the config sliders
//   config view  -> re-seed the sliders back to their starting point (the
//                   preset shown in the "from:" label), keeping the effect on
export type EffectSubView = 'presets' | 'config'

export const eqSubView = writable<EffectSubView>('presets')
export const fxSubView = writable<EffectSubView>('presets')

// The Presets tab shows its cards or, drilled down from them, the texture rack
// (every lovelofi knob). ActionButtons' reset follows it: Normal for the cards,
// the rack off for the rack.
export type PresetsSubView = 'cards' | 'rack'

export const presetsSubView = writable<PresetsSubView>('cards')
