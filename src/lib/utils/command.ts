import { activeOpenTab } from './messaging'
import { chorusKeys, mediaKeys } from './selectors'

type ExecuteButtonClickParams = {
    command: string
    isShortCutKey?: boolean
}

export async function executeButtonClick({
    command,
    isShortCutKey = false
}: ExecuteButtonClickParams) {
    const { active, tabId } = await activeOpenTab()
    if (!active || !tabId) return

    if (command == 'on/off') return

    const selector =
        chorusKeys[command as keyof typeof chorusKeys] ||
        mediaKeys[command as keyof typeof mediaKeys]

    const isChorusCommand = Object.keys(chorusKeys).includes(command)

    if (isShortCutKey && isChorusCommand) return

    await browser.scripting.executeScript({
        args: [selector],
        target: { tabId },
        func: (selector) => {
            if (!selector.includes('control-button-npv')) {
                return (document.querySelector(selector) as HTMLElement)?.click()
            }
            const target = document.querySelector(selector) as HTMLElement
            const djButton = target.previousElementSibling as HTMLElement
            djButton?.click()
        }
    })

    if (!isShortCutKey) return { selector, tabId }
}
