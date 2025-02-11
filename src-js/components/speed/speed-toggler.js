import { createToggleButton } from '../toggle-button.js'

const createTag = ({ tag, id, style = '' }) => `
    <div style="display:flex;align-items:center;height:22px;${style};">
        <span class="chorus-text chorus-pill" style="line-height:22px;height:100%;font-size:14px;text-align:center;width:56px;padding:0 4px">${tag}</span>
        <input id="${id}" class="chorus-text" style="text-align:end;letter-spacing:0.5px;border:none;color:#fff;width:56px;height:100%;padding:0 4px">
    </div>
`

export const createSpeedToggler = () => `
    <div style="display:flex;justify-content:space-between;width:100%;height:3.5rem;">
        <div style="display:flex;flex-direction:column;justify-content:space-between;height:100%">
            ${createTag({ tag: 'Track', id: 'speed-track-value', style: 'margin-bottom:4px' })}
            ${createTag({ tag: 'Global', id: 'speed-global-value' })}
        </div>

        <div style="display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end">
            ${createToggleButton({
                labelId: 'speed-label',
                labelText: 'Global Rate',
                onPathId: 'speed-toggle-on',
                offPathId: 'speed-toggle-off',
                checkboxId: 'speed-checkbox',
                buttonId: 'speed-toggle-button'
            })}
            ${createToggleButton({
                labelId: 'pitch-label',
                labelText: 'Pitch Correct',
                onPathId: 'pitch-toggle-on',
                offPathId: 'pitch-toggle-off',
                checkboxId: 'pitch-checkbox',
                buttonId: 'pitch-toggle-button'
            })}
        </div>
    </div>
`
