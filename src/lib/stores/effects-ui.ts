import { writable } from 'svelte/store'

// Which sub-view the fx/eq/ms tabs are showing. ActionButtons' reset uses this for
// context-sensitive semantics:
//   presets view -> clear the effect (off) + flatten the config sliders
//   config view  -> re-seed the sliders back to their starting point (the
//                   preset shown in the "from:" label), keeping the effect on
export type EffectSubView = 'presets' | 'config'

export const eqSubView = writable<EffectSubView>('presets')
export const fxSubView = writable<EffectSubView>('presets')
export const msSubView = writable<EffectSubView>('presets')

// The Presets tab shows its cards or, drilled down from them, the texture rack
// (every lovelofi knob). ActionButtons' reset follows it: Normal for the cards,
// the rack off for the rack.
export type PresetsSubView = 'cards' | 'rack'

export const presetsSubView = writable<PresetsSubView>('cards')

// The Snip tab shows its editor or, drilled down from the sections row, the
// lyrics picker that sets the selected section from two lines.
export type SnipSubView = 'editor' | 'lyrics'

export const snipSubView = writable<SnipSubView>('editor')

// A request from outside the popover (the player tray's sleep moon) to open
// it on a tab. SettingsPopover opens on a value and clears it when closed.
export const popoverTab = writable<string | null>(null)
