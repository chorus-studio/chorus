async function getActiveTab() {
    const currentWindow = await chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: ['*://open.spotify.com/*']
    })
    if (currentWindow.length) return currentWindow.at(0)

    const anyWindow = await chrome.tabs.query({ url: ['*://open.spotify.com/*'] })
    return anyWindow?.at(0)
}

async function activeOpenTab() {
    const tab = await getActiveTab()
    return { active: !!tab?.id, tabId: tab?.id }
}

function messenger({ tabId, message }) {
    chrome.tabs.sendMessage(tabId, message)
}

async function sendMessage({ message }) {
    const activeTab = await getActiveTab()
    if (!activeTab) return

    messenger({ tabId: activeTab.id, message })
}

function sendBackgroundMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) return reject({ error: chrome.runtime.lastError })
            return resolve(response)
        })
    })
}

export { sendMessage, sendBackgroundMessage, getActiveTab, activeOpenTab }
