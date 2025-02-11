const createLabel = (text) => `
    <div class="chorus-common" style="display:flex;align-items:center;height:22px;">
        <span class="chorus-text chorus-pill" style="font-size:1rem;line-height:22px;height:100%;text-align:center;min-width:43px;width:56px;padding:0 4px">
            ${text}
        </span>
        <input id="chorus-${text}" class="chorus-text" style="letter-spacing:0.5px;padding:0 4px;width:100%;text-align:end;background:green;border:none;color:#fff;height:100%;">
    </div>
`

export const createRangeLabels = () => `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:100%">
        ${createLabel('start')}
        ${createLabel('end')}
    </div>
`
