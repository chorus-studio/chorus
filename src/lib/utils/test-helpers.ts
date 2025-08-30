/**
 * Test utilities for refactored code
 * Ensures functionality is maintained during refactoring
 */

import { get } from 'svelte/store'
import type { Writable } from 'svelte/store'

/**
 * Mock DOM environment for testing
 */
export class MockDOM {
    private elements: Map<string, MockElement> = new Map()
    private eventListeners: Map<string, EventListener[]> = new Map()

    createElement(selector: string, properties: Record<string, any> = {}): MockElement {
        const element = new MockElement(selector, properties)
        this.elements.set(selector, element)
        return element
    }

    querySelector(selector: string): MockElement | null {
        return this.elements.get(selector) || null
    }

    addEventListener(event: string, listener: EventListener): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)!.push(listener)
    }

    removeEventListener(event: string, listener: EventListener): void {
        const listeners = this.eventListeners.get(event)
        if (listeners) {
            const index = listeners.indexOf(listener)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }

    dispatchEvent(event: string, detail?: any): void {
        const listeners = this.eventListeners.get(event) || []
        const customEvent = { detail, preventDefault: () => {}, stopPropagation: () => {} }
        listeners.forEach(listener => listener(customEvent as any))
    }

    clear(): void {
        this.elements.clear()
        this.eventListeners.clear()
    }
}

export class MockElement {
    public dataset: Record<string, string> = {}
    public textContent: string = ''
    public innerHTML: string = ''
    public classList: Set<string> = new Set()
    public children: MockElement[] = []
    private attributes: Map<string, string> = new Map()
    private eventListeners: Map<string, EventListener[]> = new Map()

    constructor(
        public selector: string,
        properties: Record<string, any> = {}
    ) {
        Object.assign(this, properties)
    }

    click(): void {
        this.dispatchEvent('click')
    }

    getAttribute(name: string): string | null {
        return this.attributes.get(name) || null
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value)
    }

    addEventListener(event: string, listener: EventListener): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)!.push(listener)
    }

    removeEventListener(event: string, listener: EventListener): void {
        const listeners = this.eventListeners.get(event)
        if (listeners) {
            const index = listeners.indexOf(listener)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }

    private dispatchEvent(event: string, detail?: any): void {
        const listeners = this.eventListeners.get(event) || []
        const mockEvent = {
            target: this,
            currentTarget: this,
            detail,
            preventDefault: () => {},
            stopPropagation: () => {}
        }
        listeners.forEach(listener => listener(mockEvent as any))
    }

    querySelectorAll(selector: string): MockElement[] {
        return this.children.filter(child => 
            child.selector.includes(selector)
        )
    }
}

/**
 * Mock storage for testing
 */
export class MockStorage {
    private data: Map<string, any> = new Map()

    async getItem(key: string): Promise<{ value: any } | null> {
        const value = this.data.get(key)
        return value !== undefined ? { value } : null
    }

    async setItem(key: string, item: { value: any }): Promise<void> {
        this.data.set(key, item.value)
    }

    async removeItem(key: string): Promise<void> {
        this.data.delete(key)
    }

    clear(): void {
        this.data.clear()
    }

    has(key: string): boolean {
        return this.data.has(key)
    }

    getAll(): Record<string, any> {
        return Object.fromEntries(this.data)
    }
}

/**
 * Test assertion utilities
 */
export class TestAssert {
    static assertEquals(actual: any, expected: any, message?: string): void {
        if (actual !== expected) {
            throw new Error(
                message || `Expected ${expected}, but got ${actual}`
            )
        }
    }

    static assertDeepEquals(actual: any, expected: any, message?: string): void {
        const actualStr = JSON.stringify(actual, null, 2)
        const expectedStr = JSON.stringify(expected, null, 2)
        
        if (actualStr !== expectedStr) {
            throw new Error(
                message || `Expected ${expectedStr}, but got ${actualStr}`
            )
        }
    }

    static assertTrue(condition: boolean, message?: string): void {
        if (!condition) {
            throw new Error(message || 'Expected condition to be true')
        }
    }

    static assertFalse(condition: boolean, message?: string): void {
        if (condition) {
            throw new Error(message || 'Expected condition to be false')
        }
    }

    static assertThrows(fn: () => void, expectedError?: string): void {
        let thrown = false
        try {
            fn()
        } catch (error) {
            thrown = true
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (expectedError && !errorMessage.includes(expectedError)) {
                throw new Error(
                    `Expected error containing '${expectedError}', but got '${errorMessage}'`
                )
            }
        }
        
        if (!thrown) {
            throw new Error('Expected function to throw an error')
        }
    }

    static async assertRejects(
        promise: Promise<any>, 
        expectedError?: string
    ): Promise<void> {
        let rejected = false
        try {
            await promise
        } catch (error) {
            rejected = true
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (expectedError && !errorMessage.includes(expectedError)) {
                throw new Error(
                    `Expected rejection containing '${expectedError}', but got '${errorMessage}'`
                )
            }
        }
        
        if (!rejected) {
            throw new Error('Expected promise to reject')
        }
    }
}

/**
 * Store testing utilities
 */
export class StoreTestHelper {
    static async testStoreUpdate<T>(
        store: Writable<T>,
        updateFn: () => Promise<void>,
        expectedValue: T
    ): Promise<void> {
        await updateFn()
        const currentValue = get(store)
        TestAssert.assertDeepEquals(currentValue, expectedValue)
    }

    static createMockStore<T>(initialValue: T): Writable<T> {
        const subscribers: Array<(value: T) => void> = []
        let value = initialValue

        return {
            subscribe: (callback: (value: T) => void) => {
                subscribers.push(callback)
                callback(value)
                return () => {
                    const index = subscribers.indexOf(callback)
                    if (index > -1) subscribers.splice(index, 1)
                }
            },
            set: (newValue: T) => {
                value = newValue
                subscribers.forEach(callback => callback(value))
            },
            update: (updater: (value: T) => T) => {
                value = updater(value)
                subscribers.forEach(callback => callback(value))
            }
        }
    }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
    static async measureExecution<T>(
        fn: () => T | Promise<T>,
        name: string = 'operation'
    ): Promise<{ result: T; duration: number }> {
        const start = performance.now()
        const result = await fn()
        const duration = performance.now() - start
        
        console.log(`${name} took ${duration.toFixed(2)}ms`)
        return { result, duration }
    }

    static async benchmarkComparison<T>(
        originalFn: () => T | Promise<T>,
        refactoredFn: () => T | Promise<T>,
        iterations: number = 100
    ): Promise<{
        originalAvg: number
        refactoredAvg: number
        improvement: number
    }> {
        // Warm up
        await originalFn()
        await refactoredFn()

        // Benchmark original
        const originalTimes: number[] = []
        for (let i = 0; i < iterations; i++) {
            const start = performance.now()
            await originalFn()
            originalTimes.push(performance.now() - start)
        }

        // Benchmark refactored
        const refactoredTimes: number[] = []
        for (let i = 0; i < iterations; i++) {
            const start = performance.now()
            await refactoredFn()
            refactoredTimes.push(performance.now() - start)
        }

        const originalAvg = originalTimes.reduce((a, b) => a + b) / originalTimes.length
        const refactoredAvg = refactoredTimes.reduce((a, b) => a + b) / refactoredTimes.length
        const improvement = ((originalAvg - refactoredAvg) / originalAvg) * 100

        return { originalAvg, refactoredAvg, improvement }
    }
}

/**
 * Test suite runner
 */
export class TestSuite {
    private tests: Array<{ name: string; fn: () => void | Promise<void> }> = []
    private results: Array<{ name: string; passed: boolean; error?: Error }> = []

    test(name: string, fn: () => void | Promise<void>): void {
        this.tests.push({ name, fn })
    }

    async run(): Promise<{ passed: number; failed: number; results: Array<any> }> {
        console.log(`Running ${this.tests.length} tests...`)
        
        for (const test of this.tests) {
            try {
                await test.fn()
                this.results.push({ name: test.name, passed: true })
                console.log(`✓ ${test.name}`)
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error))
                this.results.push({ name: test.name, passed: false, error: errorObj })
                console.error(`✗ ${test.name}: ${errorObj.message}`)
            }
        }

        const passed = this.results.filter(r => r.passed).length
        const failed = this.results.filter(r => !r.passed).length
        
        console.log(`\nTest Results: ${passed} passed, ${failed} failed`)
        
        return { passed, failed, results: this.results }
    }
}