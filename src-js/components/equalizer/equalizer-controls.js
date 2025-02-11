import { createResetText } from '../reset-text.js'
import { createEqualizerButtons } from './equalizer-buttons.js'
import { createSelector, createSelectorPreset } from '../selector.js'
import { customPresets, spotifyPresets } from '../../lib/equalizer/presets.js'

export const createEqualizerControls = () => `
    <div id="chorus-eq-controls" class="chorus-controls-body" style="margin-top:0.625rem">
        <div style="display:flex;flex-direction:column;justify-content:space-between;height:5.5rem;">
            ${createSelector({ name: 'spotify-equalizer', labelName: 'spotify eq presets', optionNames: spotifyPresets })}
            ${createSelector({ name: 'custom-equalizer', labelName: 'custom eq presets', optionNames: customPresets })}
            ${createSelectorPreset({ id: 'equalizer', text: 'active eq preset' })}
        </div>
        ${createEqualizerButtons()}
        ${createResetText()}
    </div>
`
