import { getCommandService } from '$lib/utils/command'

function getBrowser() {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Edg')) return 'edge'
    if (userAgent.includes('Chrome')) return 'chrome'
    if (userAgent.includes('Firefox')) return 'firefox'
    return 'chrome'
}

/** Open the browser's own page for binding extension shortcuts (focusing it if already open). */
export async function openShortcutSettings() {
    const browser = getBrowser()
    const url = browser == 'firefox' ? 'about:addons' : `${browser}://extensions/shortcuts`
    await getCommandService().openShortcutSettings(url)
}

/** "Alt+Shift+1" → ["Alt", "Shift", "1"], for rendering as keycaps. */
export const shortcutKeys = (combo: string) =>
    combo
        .split('+')
        .map((k) => k.trim())
        .filter(Boolean)

/** The bound key combo of every command, by command name ("" when unbound). */
export async function boundShortcuts(): Promise<Record<string, string>> {
    try {
        const commands = (await getCommandService().getCommands()) as chrome.commands.Command[]
        return Object.fromEntries(
            commands.filter((c) => c.name).map((c) => [c.name as string, c.shortcut ?? ''])
        )
    } catch {
        return {}
    }
}
