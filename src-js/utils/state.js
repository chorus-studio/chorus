function stateResolver({ resolve, reject, result, key, values }) {
    if (chrome.runtime.lastError) {
        console.error({ error: chrome.runtime.lastError })
        return reject({ error: chrome.runtime.lastError })
    }

    if (key) return resolve(result?.[key])
    if (values) return resolve(values)

    return resolve(result)
}

function setState({ key, values }) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: values }, (result) =>
            stateResolver({ resolve, reject, result, values })
        )
    })
}

function getState(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (result) => stateResolver({ key, resolve, reject, result }))
    })
}

function removeState(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, (result) =>
            stateResolver({ key, resolve, reject, result })
        )
    })
}

export { setState, getState, removeState }
