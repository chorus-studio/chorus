import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

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
    const { subscribe, update } = store

    async function resetIteration() {
        update((loop) => ({ ...loop, iteration: 1, looping: false }))
        await storage.setItem<Loop>('local:chorus_loop', defaultLoop)
    }

    async function toggleType(type: 'infinite' | 'amount') {
        update((previous) => ({
            ...previous,
            type,
            looping: true,
            ...(type === 'amount' && { iteration: previous.amount })
        }))
        const newState = get(store)
        await storage.setItem<Loop>('local:chorus_loop', newState)
    }

    async function toggleLoop() {
        update((loop) => ({
            ...loop,
            looping: !loop.looping,
            ...(loop.type === 'amount' && { iteration: loop.amount })
        }))

        const newState = get(store)
        await storage.setItem<Loop>('local:chorus_loop', newState)
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
        await storage.setItem<Loop>('local:chorus_loop', newState)
    }

    async function setIteration(iteration: number) {
        update((loop) => ({ ...loop, iteration, looping: true }))
        const newState = get(store)
        await storage.setItem<Loop>('local:chorus_loop', newState)
    }

    storage.getItem<Loop>('local:chorus_loop', { fallback: defaultLoop }).then((savedState) => {
        if (savedState) store.set(savedState)
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
