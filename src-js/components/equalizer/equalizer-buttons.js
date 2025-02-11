import { createTextButton } from '../text-button.js'

export const createEqualizerButtons = () => `
    <div class="chorus-controls-buttons">
        ${createTextButton({ text: 'reset', id: 'equalizer-reset' })}
        ${createTextButton({ text: 'save', id: 'equalizer-save' })}
    </div>
`
