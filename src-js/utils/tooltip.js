export function updateToolTip(element) {
    const ariaLabel = element?.getAttribute('aria-label')
    const toolTip = document.getElementById('tooltip')

    if (!toolTip || !ariaLabel) return

    toolTip.textContent = ariaLabel
    const rect = element.getBoundingClientRect()
    const toolTipRect = toolTip.getBoundingClientRect()

    toolTip.style.left = `${rect.left + rect.width / 2 - toolTipRect.width / 2}px`
    toolTip.style.top = `${rect.top - 40}px`
}
