import { createToggleButton } from '../toggle-button.js'

export const createSnipToggler = () => `
    <div style="display:flex;justify-content:flex-end;align-items:center;width:100%;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
            ${createToggleButton({
                labelId: 'loop-label',
                labelText: 'Auto-Loop',
                onPathId: 'loop-toggle-on',
                offPathId: 'loop-toggle-off',
                checkboxId: 'loop-checkbox',
                buttonId: 'loop-toggle-button'
            })}
        </div>
    </div>
`
