/**
 * Centralized DOM selector constants and utilities
 * Single responsibility: DOM selector management
 */
export const SELECTORS = {
    // Volume controls
    MUTE_BUTTON: '[data-testid="volume-bar-toggle-mute-button"]',
    
    // Playback controls
    SKIP_FORWARD: '[data-testid="control-button-skip-forward"]',
    SKIP_BACKWARD: '[data-testid="control-button-skip-back"]',
    PLAY_PAUSE: '[data-testid="control-button-playpause"]',
    
    // Track info
    CONTEXT_TITLE: '[data-testid="context-item-info-title"] > span > a',
    TRACK_INFO: '[data-testid="context-item-info-subtitles"]',
    
    // Progress and time
    PROGRESS_BAR: '[data-testid="progress-bar"]',
    PLAYBACK_POSITION: '[data-testid="playback-position"]',
    PLAYBACK_DURATION: '[data-testid="playback-duration"]',
    
    // Queue
    QUEUE_ASIDE: 'aside[aria-label="Queue"]',
    NEXT_IN_QUEUE: '[aria-label="Next in queue"]',
    NEXT_UP: '[aria-label="Next up"]',
    NOW_PLAYING: '[aria-label="Now playing"]'
} as const

// Legacy exports for backward compatibility
export const chorusKeys = SELECTORS
export const mediaKeys = SELECTORS

/**
 * Safe DOM query utilities with error handling
 */
export class DOMQueryHelper {
    /**
     * Safely query a single element
     */
    static querySelector<T extends Element = Element>(selector: string): T | null {
        try {
            return document.querySelector<T>(selector)
        } catch (error) {
            console.warn(`Failed to query selector: ${selector}`, error)
            return null
        }
    }

    /**
     * Safely query multiple elements
     */
    static querySelectorAll<T extends Element = Element>(selector: string): T[] {
        try {
            return Array.from(document.querySelectorAll<T>(selector))
        } catch (error) {
            console.warn(`Failed to query selector: ${selector}`, error)
            return []
        }
    }

    /**
     * Wait for element to appear in DOM
     */
    static waitForElement<T extends Element = Element>(
        selector: string, 
        timeout = 5000
    ): Promise<T | null> {
        return new Promise((resolve) => {
            const element = this.querySelector<T>(selector)
            if (element) {
                resolve(element)
                return
            }

            const observer = new MutationObserver(() => {
                const element = this.querySelector<T>(selector)
                if (element) {
                    observer.disconnect()
                    resolve(element)
                }
            })

            observer.observe(document.body, {
                childList: true,
                subtree: true
            })

            setTimeout(() => {
                observer.disconnect()
                resolve(null)
            }, timeout)
        })
    }

    /**
     * Check if element exists and is visible
     */
    static isElementVisible(selector: string): boolean {
        const element = this.querySelector(selector)
        if (!element) return false

        const style = window.getComputedStyle(element)
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0'
    }
}