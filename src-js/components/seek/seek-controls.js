import { createResetText } from '../reset-text.js'
import { createSeekInputs } from './seek-inputs.js'
import { createSeekButtons } from './seek-buttons.js'
import { createSeekToggler } from './seek-toggler.js'

export const createSeekControls = () => `
    <div id="chorus-seek-controls" class="chorus-controls-body">
        <div style="margin:.75rem 0">
            ${createSeekInputs()}
        </div>
        <div style="margin-bottom:.75rem">
            ${createSeekToggler()}
        </div>
        ${createResetText()}
        ${createSeekButtons()}
    </div>
`
