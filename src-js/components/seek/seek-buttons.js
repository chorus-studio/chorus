import { createTextButton } from '../text-button.js'

export const createSeekButtons = () => ` 
    <div class="chorus-controls-buttons">
        ${createTextButton({ id: 'seek-reset', text: 'reset' })}
        ${createTextButton({ id: 'seek-save', text: 'save' })}
    </div>
`
