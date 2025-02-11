import { createTextButton } from '../text-button.js'

export const createSpeedButtons = () => ` 
    <div class="chorus-controls-buttons">
        ${createTextButton({ id: 'speed-reset', text: 'reset' })}
        ${createTextButton({ id: 'speed-save', text: 'save' })}
    </div>
`
