import { defineProxyService } from '@webext-core/proxy-service'

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

export interface ICommandService {
    openShortcutSettings: (url: string) => Promise<void>
    getCommands: () => Promise<chrome.commands.Command[]>
}

export class CommandService implements ICommandService {
    async getCommands() {
        return await chrome.commands.getAll()
    }

    async openShortcutSettings(url: string) {
        const tabs = await chrome.tabs.query({ url })
        if (tabs?.[0]?.id) {
            await chrome.tabs.update(tabs[0].id, { active: true })
        } else {
            await chrome.tabs.create({ url })
        }
    }
}

export const [registerCommandService, getCommandService] = defineProxyService(
    'CommandService',
    () => new CommandService()
)
