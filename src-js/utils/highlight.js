const isHighlightable = ({ isSnip, isSkipped, playbackRate = '1', preservesPitch = true }) =>
    isSnip || isSkipped || !preservesPitch || !['1', '1.000', '1000'].includes(playbackRate)

export const highlightElement = ({
    selector,
    songStateData,
    context = document,
    property = 'stroke'
}) => {
    let element
    const timer = setInterval(() => {
        if (element) {
            clearInterval(timer)
            return
        }

        element = context.querySelector(selector)
        if (!element) return

        const fillColor = isHighlightable(songStateData) ? '#1ed760' : 'currentColor'
        element.setAttribute(property, fillColor)
    }, 250)
}

export const highlightIconTimer = ({ highlight, selector, fill = false }) => {
    let updated
    const timer = setInterval(() => {
        if (updated) {
            clearInterval(timer)
            return
        }

        updated = highlightIcon({ highlight, selector, fill })
    }, 0)
}

export const highlightIcon = ({ highlight, selector, fill = false }) => {
    const svgIcon = document.querySelector(selector)
    if (!svgIcon) return false

    const colour = highlight ? '#1ed760' : 'currentColor'
    const fillColour = highlight ? '#1ed760' : fill ? 'unset' : 'currentColor'
    svgIcon.setAttribute('stroke', colour)
    svgIcon.setAttribute('fill', fillColour)

    return true
}
