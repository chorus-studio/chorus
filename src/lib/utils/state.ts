import { storage } from '@wxt-dev/storage'

type ChromeError = {
    error: chrome.runtime.LastError
}

type StateKey = string
type StateValue = unknown
type StateResult = Record<string, unknown>

async function setState(params: { key: StateKey; values: StateValue }) {
    await storage.setItem(`local:${params.key}`, params.values)
}

async function getState(key: StateKey) {
    return await storage.getItem(`local:${key}`)
}

async function removeState(key: StateKey) {
    await storage.removeItem(`local:${key}`)
}

export { setState, getState, removeState }
export type { StateKey, StateValue, StateResult }
