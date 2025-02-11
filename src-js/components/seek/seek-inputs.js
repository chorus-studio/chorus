const createSeekButton = ({ role, text }) => `
    <button 
        role="${role}"
        class="chorus-pill"
        id="seek-${role}-button"
        style="z-index:10;width:2rem;height:2rem;"
    >
        <span 
            class="chorus-text"
            style="position:relative;z-index:-1;display:inline-block;font-size:x-large;"
        >
            ${text}
        </span>
    </button>
`

const createInput = ({ id, name, scale = 1 }) => `
    <div style="position:relative;height:3rem;margin:0 .5rem;">
        <input
            min="1"
            max="60"
            step="1"
            type="number"
            id="seek-${id}-input"
            name="chorus-seek-${name}"
            style="position:absolute;width:2rem;background:transparent;font-size:larger;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;"
        >

        <svg 
            fill="none" 
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style="transform:scaleX(${scale});height:100%"
        >
            <g
                stroke="#1ed760"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
            >
                <path d="m14.55 21.67c4.29-1.13 7.45-5.03 7.45-9.67 0-5.52-4.44-10-10-10-6.67 0-10 5.56-10 5.56m0 0v-4.56m0 4.56h2.01 2.43" />
                <path d="m2 12c0 5.52 4.48 10 10 10" opacity=".4" stroke-dasharray="3 3"/>
            </g>
        </svg>
    </div>
`

export const createSeekInputs = () => `
    <div style="display:flex;justify-content:space-between">
        <div style="display:flex;flex-wrap:wrap;">
            <div class="chorus-common" style="height:unset;width: 100%">
                ${createSeekButton({ role: 'rw-down', text: '&#8722;' })}
                ${createInput({ id: 'rw', name: 'back', scale: 1 })}
                ${createSeekButton({ role: 'rw-up', text: '&#43;' })}
            </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;">
            <div class="chorus-common" style="height:unset;width:100%">
                ${createSeekButton({ role: 'ff-down', text: '&#8722;' })}
                ${createInput({ id: 'ff', name: 'forward', scale: -1 })}
                ${createSeekButton({ role: 'ff-up', text: '&#43;' })}
            </div>
        </div>
    </div>
`
