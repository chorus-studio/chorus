export const SETTINGS_ICON = {
    role: 'settings',
    id: 'chorus-icon',
    strokeWidth: 1.5,
    viewBox: '0 0 24 24',
    ariaLabel: 'Settings',
    stroke: 'currentColor'
}

export const SNIP_ICON = {
    role: 'snip',
    ariaLabel: 'Edit Snip',
    stroke: 'currentColor'
}

export const SKIP_ICON = {
    role: 'skip',
    ariaLabel: 'Block Track'
}

export const NOW_PLAYING_SKIP_ICON = {
    ...SKIP_ICON,
    id: 'chorus-skip'
}

export const TRACK_HEART = {
    lw: 22,
    role: 'heart',
    ariaLabel: 'Like Song',
    stroke: 'currentColor',
    fill: 'none',
    viewBox: '-5 -4 24 24'
}

export const HEART_ICON = {
    id: 'chorus-heart',
    ...TRACK_HEART
}

const SVG_PATHS = {
    heart: `
        <path role="heart" d="M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z"/>
    `,
    skip: `
        <path role="skip" fill-rule="evenodd"
              d="M5.965 4.904l9.131 9.131a6.5 6.5 0 00-9.131-9.131zm8.07 10.192L4.904 5.965a6.5 6.5 0 009.131 9.131zM4.343 4.343a8 8 0 1111.314 11.314A8 8 0 014.343 4.343z" clip-rule="evenodd"
        />
    `,
    default: `
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
        />
    `
}

const BUTTON_STYLES = {
    settings:
        'padding:0 4px;border:none;background:none;display:flex;justify-content:center;align-items:center;cursor:pointer;',
    default:
        'visibility:hidden;border:none;background:unset;display:flex;align-items:center;cursor:pointer;'
}

export const createIcon = ({
    role,
    viewBox,
    id,
    ariaLabel,
    strokeWidth,
    stroke,
    fill = 'currentColor',
    lw = '1.25rem'
}) => {
    const svgPath = SVG_PATHS[role] || SVG_PATHS.default
    const buttonStylesKey = id ? 'settings' : 'default'
    let buttonStyles = BUTTON_STYLES[buttonStylesKey]
    if (role == 'skip' && !id) buttonStyles += 'padding-right: 4px;'

    return `
        <button 
            type="button"
            role="${role}"
            id="${id || ''}"
            style="${buttonStyles}"
            aria-label="${ariaLabel || ''}"
            class="${id ? 'chorus-hover-white' : ''}"
        >
            <svg
                role="${role}"
                width="${lw}"
                height="${lw}"
                fill="${fill}"
                stroke="${stroke || ''}"
                stroke-width="${strokeWidth || 1.5}"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="${viewBox || '0 0 20 20'}"
                preserveAspectRatio="xMidYMid meet"
                style="margin-bottom: ${role == 'snip' ? '4' : '0'}px"
            >
                ${svgPath}
            </svg>
        </button>
    `
}
