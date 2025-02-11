export const createHeaderButton = ({ role, ariaLabel, additionalStyles }) => `
    <button 
        role="${role}"
        ariaLabel="${ariaLabel}"
        id="chorus-${role}-button"
        class="chorus-text-button"
        style="height:21px;padding:0 .25rem;padding-bottom:.125rem;font-size:14px;${additionalStyles || ''}"
    >
        <span>${role}</span>
    </button>
`

export const createHeader = () => `
    <div class="chorus-common">
        <span class="chorus-header">chorus</span>
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div id="header-buttons" style="display:flex;height:25px;align-items:center;justify-content:space-around;">
                ${createHeaderButton({ role: 'snip', ariaLabel: 'Snip Controls', additionalStyles: 'background-color:green;' })}
                ${createHeaderButton({ role: 'speed', ariaLabel: 'Speed Controls', additionalStyles: 'margin-left:.5rem;' })}
                ${createHeaderButton({ role: 'fx', ariaLabel: 'FX Controls', additionalStyles: 'margin-left:.5rem;' })}
                ${createHeaderButton({ role: 'eq', ariaLabel: 'EQ Controls', additionalStyles: 'margin-left:.5rem;' })}
                ${createHeaderButton({ role: 'seek', ariaLabel: 'Seek Controls', additionalStyles: 'margin:0 .5rem;' })}
            </div>

            <button id="chorus-modal-close-button" class="chorus-close-button">
                <svg 
                    role="img"
                    fill="none"
                    width="20px"
                    height="20px"
                    stroke="#fff"
                    stroke-width="2"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </div>
`
