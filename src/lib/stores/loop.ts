import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

const LOOP_STORE_KEY = 'local:chorus_loop'
type Loop = {
    type: 'infinite' | 'amount'
    amount: number
    iteration: number
    looping: boolean
}

const defaultLoop: Loop = {
    type: 'amount',
    amount: 1,
    iteration: 1,
    looping: false
}

function createLoopStore() {
    const store = writable<Loop>(defaultLoop)
    const { subscribe, update, set } = store
    let isUpdatingStorage = false

    async function resetIteration() {
        update((loop) => ({ ...loop, iteration: 1, looping: false }))
        isUpdatingStorage = true
        try {
            await storage.setItem<Loop>(LOOP_STORE_KEY, defaultLoop)
        } catch (error) {
            console.error('Error resetting iteration in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function toggleType(type: 'infinite' | 'amount') {
        update((previous) => ({
            ...previous,
            type,
            looping: true,
            ...(type === 'amount' && { iteration: previous.amount })
        }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<Loop>(LOOP_STORE_KEY, newState)
        } catch (error) {
            console.error('Error toggling type in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function toggleLoop() {
        update((loop) => ({
            ...loop,
            looping: !loop.looping,
            ...(loop.type === 'amount' && { iteration: loop.amount })
        }))

        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<Loop>(LOOP_STORE_KEY, newState)
        } catch (error) {
            console.error('Error toggling loop in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function decrement() {
        update((state) => {
            const newIteration = state.iteration - 1
            return {
                ...state,
                iteration: newIteration == 0 ? state.amount : newIteration,
                looping: newIteration > 0
            }
        })
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<Loop>(LOOP_STORE_KEY, newState)
        } catch (error) {
            console.error('Error decrementing in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function setIteration(iteration: number) {
        update((loop) => ({ ...loop, iteration, looping: true }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<Loop>(LOOP_STORE_KEY, newState)
        } catch (error) {
            console.error('Error setting iteration in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage.getItem<Loop>(LOOP_STORE_KEY, { fallback: defaultLoop }).then((savedState) => {
        if (!savedState) return

        // Sync the stored loop with the current type definition
        const syncedState = syncWithType(savedState, defaultLoop)
        set(syncedState)

        // Update storage with synced state
        isUpdatingStorage = true
        storage
            .setItem<Loop>(LOOP_STORE_KEY, syncedState)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    storage.watch<Loop>(LOOP_STORE_KEY, (newState) => {
        if (!newState || isUpdatingStorage) return

        const syncedState = syncWithType(newState, defaultLoop)
        set(syncedState)
    })

    return {
        subscribe,
        toggleType,
        toggleLoop,
        setIteration,
        decrement,
        resetIteration
    }
}

export const loopStore = createLoopStore()
