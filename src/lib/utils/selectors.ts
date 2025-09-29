/**
 * Command to DOM selector mappings for browser extension keyboard shortcuts
 */
export const mediaKeys = {
    dj: '[data-testid="control-button-npv"]',
    repeat: '[data-testid="control-button-repeat"]',
    shuffle: '[data-testid="control-button-shuffle"]',
    next: '[data-testid="control-button-skip-forward"]',
    previous: '[data-testid="control-button-skip-back"]',
    'play/pause': '[data-testid="control-button-playpause"]',
    'mute/unmute': '[data-testid="volume-bar-toggle-mute-button"]'
}

export const chorusKeys = {
    loop: '#loop-button',
    'mute/unmute': '#volume-button',
    'seek-rewind': '#seek-player-rw-button',
    'seek-forward': '#seek-player-ff-button',
    'toggle-config': '#chorus-config-dialog-trigger',
    'toggle-new-releases': '#chorus-new-releases-icon',
    settings: '[data-testid="now-playing-widget"] div#chorus-ui #chorus-settings',
    'save/unsave': '[data-testid="now-playing-widget"] div#chorus-ui #chorus-heart',
    'block-track': '[data-testid="now-playing-widget"] div#chorus-ui #chorus-block'
}

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
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
    }
}
