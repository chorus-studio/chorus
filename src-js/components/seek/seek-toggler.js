import { createToggleButton } from '../toggle-button.js'

const createTag = ({ id, tag, style = '' }) => `
    <div style="display:flex;align-items:center;">
        <span id="seek-${id}-label" class="chorus-text chorus-pill" style="${style}">${tag}</span>
    </div>
`

export const createSeekToggler = () => `
    <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
        <div style="display:flex;justify-content:space-between;">
            ${createTag({ id: 'global', tag: 'G', style: 'background:green;' })}
            ${createTag({ id: 'shows', tag: 'PA' })}
        </div>

        <div>
            <div style="display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end">
                ${createToggleButton({
                    labelText: 'Global',
                    labelId: 'seek-label',
                    onPathId: 'seek-toggle-on',
                    checkboxId: 'seek-checkbox',
                    offPathId: 'seek-toggle-off',
                    buttonId: 'seek-toggle-button'
                })}
            </div>
        </div>
    </div>
`
