import { createTextButton } from '../text-button.js'

export const createEffectsButtons = () => `
    <div class="chorus-controls-buttons">
        ${createTextButton({ text: 'reset', id: 'effects-reset' })}
        ${createTextButton({ text: 'save', id: 'effects-save' })}
    </div>
`
