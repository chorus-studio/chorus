import { createResetText } from '../reset-text.js'
import { createEffectsButtons } from './effects-button.js'
import { createSelector, createSelectorPreset } from '../selector.js'
import { convolverPresets, roomPresets } from '../../lib/reverb/presets.js'

export const createEffectsControls = () => `
    <div id="chorus-fx-controls" class="chorus-controls-body" style="margin-top:0.625rem">
        <div style="display:flex;flex-direction:column;justify-content:space-between;height:5.5rem;">
            ${createSelector({ name: 'room-effect', labelName: 'room-sized reverb', optionNames: roomPresets })}
            ${createSelector({ name: 'convolver-effect', labelName: 'impulse reverb', optionNames: convolverPresets })}
            ${createSelectorPreset({ id: 'reverb', text: 'active reverb preset' })}
        </div>
        ${createResetText()}
        ${createEffectsButtons()}
    </div>
`
