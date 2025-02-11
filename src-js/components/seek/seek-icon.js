// type: rw | ff;
export const createSeekIcon = (type) => `
    <button 
        role="${type}"
        class="chorus-hover-white"
        id="seek-player-${type}-button"
        role="seek-player-${type}-button"
        style="display:flex;justify-content:center;align-items:center;position:relative;border:none;background:none;width:2rem;height:2rem;"
    >
        <span 
            id="seek-icon-${type}-label"
            style="position:absolute;z-index:-10;background:transparent;font-weight:bold;font-size:small;top:46%;${type == 'ff' ? 'left' : 'right'}:50%;text-align:center;">
        </span>
        <svg 
            fill="none"
            stroke="currentColor"
            stroke-width="5"
            viewBox="0 0 64 64"
            width="1.5rem"
            height="1.5rem"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
            style="transform: scaleX(${type == 'ff' ? -1 : 1});z-index:-10"
        >
            <path d="M34.46,53.91A21.91,21.91,0,1,0,12.55,31.78"></path>
            <polyline points="4.65 22.33 12.52 32.62 22.81 24.75"></polyline>
        </svg>
    </button>
`
