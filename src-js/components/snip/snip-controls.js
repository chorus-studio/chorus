import { createSlider } from './snip-slider.js'
import { createResetText } from '../reset-text.js'
import { createRangeLabels } from './snip-labels.js'
import { createSnipToggler } from './snip-toggle.js'
import { createSnipButtons } from './snip-buttons.js'

import { playback } from '../../utils/playback.js'

export const createSnipControls = () => `
    <div id="chorus-snip-controls" class="chorus-controls-body">
        ${createSlider({ current: playback.current(), duration: playback.duration(), style: 'margin:6px 0' })}
        <p style="font-size:.75rem;color:#fff;padding:0;margin-top:-8px;padding-bottom:.5rem">
            * while editing 'end', track plays 3 secs past set 'end'
        </p>
        <div style="display:flex;justify-content:space-between;height:3rem;">
            ${createRangeLabels()}
            ${createSnipToggler()}
        </div>
        ${createResetText()}
        ${createSnipButtons()}
    </div>
`
