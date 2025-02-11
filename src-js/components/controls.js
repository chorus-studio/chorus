import { createHeader } from './header.js'
import { createTrackInfo } from './track-info.js'

export const createControls = () => `
    <div id="chorus-controls">
        ${createHeader()}
        ${createTrackInfo()}
    </div>
`
