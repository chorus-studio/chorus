type SpotifyTab = chrome.tabs.Tab & {
    id: number // Make id required since we check for it
}

type Message = {
    type: string
    payload?: unknown
}

type MessengerParams = {
    tabId: number
    message: Message
}

async function getActiveTab(): Promise<SpotifyTab | undefined> {
    const currentWindow = await chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: ['*://open.spotify.com/*']
    })
    if (currentWindow.length) return currentWindow.at(0) as SpotifyTab

    const anyWindow = await chrome.tabs.query({ url: ['*://open.spotify.com/*'] })
    return anyWindow?.at(0) as SpotifyTab | undefined
}

async function activeOpenTab(): Promise<{ active: boolean; tabId: number | undefined }> {
    const tab = await getActiveTab()
    return { active: !!tab?.id, tabId: tab?.id }
}

function messenger({ tabId, message }: MessengerParams): void {
    if (!tabId) return
    chrome.tabs.sendMessage(tabId, message)
}

async function sendMessage({ message }: { message: Message }): Promise<void> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) return

    messenger({ tabId: activeTab.id, message })
}

function sendBackgroundMessage<T>(message: Message): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                return reject({ error: chrome.runtime.lastError })
            }
            return resolve(response as T)
        })
    })
}

export { sendMessage, sendBackgroundMessage, getActiveTab, activeOpenTab }
export type { Message, SpotifyTab }
