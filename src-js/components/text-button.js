const classNames = { share: 'share', save: 'success', reset: 'danger', remove: 'danger' }

export const createTextButton = ({ id, text, style }) => {
    const btnTypeClass = classNames[id?.split('-')?.at(-1)]
    return `
        <button
            id="chorus-${id}-button"
            class="chorus-text-button ${btnTypeClass ?? ''}"
            style="display:flex;justify-content:center;align-items:center;padding:0 10px;height:100%;font-size:1rem;${style || ''}"
        >
            <span>${text}</span>
        </button>
    `
}
