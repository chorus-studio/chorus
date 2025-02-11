import { createResetText } from '../reset-text.js'
import { createSpeedRange } from './speed-range.js'
import { createSpeedToggler } from './speed-toggler.js'
import { createSpeedButtons } from './speed-buttons.js'

export const createSpeedControls = () => `
    <div id="chorus-speed-controls" class="chorus-controls-body">
        ${createSpeedRange()}
        ${createSpeedToggler()}
        ${createResetText()}
        ${createSpeedButtons()}
    </div>
`
