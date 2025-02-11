export function clickOutside({ area, node }) {
    const handleClick = (event) => {
        if (!node?.contains(event.target) && !event.defaultPrevented) {
            node.dispatchEvent(new CustomEvent('click_outside', { detail: node }))
        }
    }

    const boundary = document.querySelector(area) ?? document
    boundary.addEventListener('click', handleClick, false)

    return {
        destroy() {
            boundary.removeEventListener('click', handleClick, false)
        }
    }
}
