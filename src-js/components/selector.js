const btnStyles =
    'text-align:end;cursor:pointer;background:#171717;padding:2px;padding-right:16px;color:#fff;font-size:1rem;'

const createOptions = (optionNames) =>
    optionNames
        .map(
            (name) => `<button style="${btnStyles}" name="${name}" value="${name}">${name}</button>`
        )
        .join('')

export const createSelector = ({ labelName, name, optionNames }) => `
    <div style="display:flex;position:relative;justify-content:space-between;min-height:24px;">
        <label style="color:#b3b3b3;font-size:">${labelName}</label>

        <form id="select-container" class="selector" style="overflow-y:auto;max-height:100px;">
            <button id="${name}-btn" style="display:flex;align-content:center;border:solid 1px #fff;background:transparent;color:#b3b3b3;min-width:100px;justify-content:end;">
                <span id="${name}-selected" style="color:#fff;font-size:1rem;margin-right: 4px">none</span>
                <svg style="width:1rem;height:1rem;margin-top:4px;" viewBox="0 0 256 256" fill="#fff" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="m128 182a5.98159 5.98159 0 0 1 -4.24268-1.75732l-80-80a6.00006 6.00006 0 0 1 8.48536-8.48536l75.75732 75.75733 75.75732-75.75733a6.00006 6.00006 0 0 1 8.48536 8.48536l-80 80a5.98159 5.98159 0 0 1 -4.24268 1.75732z"
                    />
                </svg>
            </button>

            <div
                id="${name}-list"
                style="margin-top:4px;min-width:140px;border:1px solid #b3b3b3;border-radius:4px;right:0;overflow-y:auto;background:#171717;flex-direction:column;max-height:110px;z-index:100;position:absolute;display:none"
            >
                ${createOptions(['none', ...optionNames])}
            </div>
        </form>
    </div>
`

export const createSelectorPreset = ({ id, text }) => `
    <hr/>
    <div style="font-size:1rem;color:#b3b3b3;">
        <p style="display:flex;justify-content:space-between;width:100%;padding-right:.125rem;">
            ${text} <span id="${id}-preset-selection" style="color:#fff;margin-right:20px"></span>
        </p>
    </div>
`
