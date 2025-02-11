import { createTextButton } from '../text-button.js'

export const createSnipButtons = () => `
    <div class="chorus-controls-buttons">
        ${createTextButton({ id: 'snip-share', text: 'share' })}
        ${createTextButton({ text: 'remove', id: 'snip-remove' })}
        ${createTextButton({ id: 'snip-save', text: 'save' })}
    </div>
`
