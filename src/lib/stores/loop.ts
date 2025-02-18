import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

type Loop = {
    type: 'infinite' | 'amount'
    amount: number
    iteration: number
    looping: boolean
}

const defaultLoop: Loop = {
    type: 'infinite',
    amount: 1,
    iteration: 1,
    looping: false
}

function createLoopStore() {
    const store = writable<Loop>(defaultLoop)
    const { subscribe, update } = store

    async function resetIteration() {
        update((loop) => ({ ...loop, iteration: 1, looping: false }))
        await storage.setItem<Loop>('local:chorus-loop', defaultLoop)
    }

    async function toggleType(type: 'infinite' | 'amount') {
        update((loop) => ({ ...loop, type, looping: true }))
        const newState = get(store)
        await storage.setItem<Loop>('local:chorus-loop', newState)
    }

    async function toggleLoop() {
        update((loop) => ({ ...loop, looping: !loop.looping }))
        const newState = get(store)
        await storage.setItem<Loop>('local:chorus-loop', newState)
    }

    async function setIteration(iteration: number) {
        update((loop) => ({ ...loop, iteration, looping: true }))
        const newState = get(store)
        await storage.setItem<Loop>('local:chorus-loop', newState)
    }

    storage.getItem<Loop>('local:chorus-loop', { fallback: defaultLoop }).then((savedState) => {
        if (savedState) store.set(savedState)
    })

    storage.watch('local:chorus-loop', (newValues) => {
        if (newValues) store.set(newValues as Loop)
    })

    return {
        subscribe,
        toggleType,
        toggleLoop,
        setIteration,
        resetIteration
    }
}

export const loopStore = createLoopStore()
