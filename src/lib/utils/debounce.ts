// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null
    
    return function (this: any, ...args: Parameters<T>) {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        
        timeoutId = setTimeout(() => {
            func.apply(this, args)
            timeoutId = null
        }, delay)
    }
}

// Throttle utility for limiting function calls
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0
    let timeoutId: NodeJS.Timeout | null = null
    
    return function (this: any, ...args: Parameters<T>) {
        const now = Date.now()
        
        if (now - lastCall >= delay) {
            lastCall = now
            func.apply(this, args)
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastCall = Date.now()
                func.apply(this, args)
                timeoutId = null
            }, delay - (now - lastCall))
        }
    }
}

// Request deduplication utility
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>()
const REQUEST_CACHE_DURATION = 1000 // 1 second

export function dedupeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    cacheDuration = REQUEST_CACHE_DURATION
): Promise<T> {
    const cached = requestCache.get(key)
    const now = Date.now()
    
    if (cached && now - cached.timestamp < cacheDuration) {
        return cached.promise
    }
    
    const promise = requestFn().finally(() => {
        // Clean up cache entry after completion
        setTimeout(() => {
            if (requestCache.get(key)?.promise === promise) {
                requestCache.delete(key)
            }
        }, cacheDuration)
    })
    
    requestCache.set(key, { promise, timestamp: now })
    return promise
}

// Batch processing utility
export class BatchProcessor<T, R> {
    private batch: T[] = []
    private timeoutId: NodeJS.Timeout | null = null
    
    constructor(
        private processFn: (items: T[]) => Promise<R[]>,
        private delay: number = 100,
        private maxSize: number = 10
    ) {}
    
    add(item: T): Promise<R> {
        return new Promise((resolve, reject) => {
            this.batch.push(item)
            
            const batchIndex = this.batch.length - 1
            
            if (this.batch.length >= this.maxSize) {
                this.flush().then(results => resolve(results[batchIndex])).catch(reject)
            } else {
                if (this.timeoutId) clearTimeout(this.timeoutId)
                this.timeoutId = setTimeout(() => {
                    this.flush().then(results => resolve(results[batchIndex])).catch(reject)
                }, this.delay)
            }
        })
    }
    
    private async flush(): Promise<R[]> {
        if (this.batch.length === 0) return []
        
        const currentBatch = [...this.batch]
        this.batch = []
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        
        try {
            return await this.processFn(currentBatch)
        } catch (error) {
            console.error('Batch processing error:', error)
            throw error
        }
    }
}