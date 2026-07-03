import { writable } from 'svelte/store'

// Which sub-view the fx/eq tabs are showing. ActionButtons' reset uses this for
// context-sensitive semantics:
//   presets view -> clear the effect (off) + flatten the config sliders
//   config view  -> re-seed the sliders back to their starting point (the
//                   preset shown in the "from:" label), keeping the effect on
export type EffectSubView = 'presets' | 'config'

export const eqSubView = writable<EffectSubView>('presets')
export const fxSubView = writable<EffectSubView>('presets')
