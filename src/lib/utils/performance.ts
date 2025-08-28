// Performance monitoring utilities
interface PerformanceMetrics {
    name: string
    duration: number
    timestamp: number
    memory?: number
}

class PerformanceMonitor {
    private static instance: PerformanceMonitor
    private metrics: PerformanceMetrics[] = []
    private observers: Array<(metrics: PerformanceMetrics) => void> = []
    private isEnabled = process.env.NODE_ENV === 'development'

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor()
        }
        return PerformanceMonitor.instance
    }

    enable(): void {
        this.isEnabled = true
    }

    disable(): void {
        this.isEnabled = false
    }

    measure<T>(name: string, fn: () => T): T
    measure<T>(name: string, fn: () => Promise<T>): Promise<T>
    measure<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
        if (!this.isEnabled) {
            return fn()
        }

        const startTime = performance.now()
        const startMemory = this.getMemoryUsage()

        try {
            const result = fn()
            
            if (result instanceof Promise) {
                return result.finally(() => {
                    this.recordMetric(name, startTime, startMemory)
                })
            } else {
                this.recordMetric(name, startTime, startMemory)
                return result
            }
        } catch (error) {
            this.recordMetric(name, startTime, startMemory)
            throw error
        }
    }

    startTimer(name: string): () => void {
        if (!this.isEnabled) {
            return () => {}
        }

        const startTime = performance.now()
        const startMemory = this.getMemoryUsage()
        
        return () => {
            this.recordMetric(name, startTime, startMemory)
        }
    }

    private recordMetric(name: string, startTime: number, startMemory?: number): void {
        const duration = performance.now() - startTime
        const currentMemory = this.getMemoryUsage()
        
        const metric: PerformanceMetrics = {
            name,
            duration,
            timestamp: Date.now(),
            memory: currentMemory && startMemory ? currentMemory - startMemory : undefined
        }

        this.metrics.push(metric)
        this.notifyObservers(metric)

        // Keep only last 1000 metrics
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000)
        }
    }

    private getMemoryUsage(): number | undefined {
        if ('memory' in performance) {
            return (performance as any).memory?.usedJSHeapSize
        }
        return undefined
    }

    onMetric(callback: (metric: PerformanceMetrics) => void): void {
        this.observers.push(callback)
    }

    private notifyObservers(metric: PerformanceMetrics): void {
        this.observers.forEach(observer => {
            try {
                observer(metric)
            } catch (error) {
                console.warn('Performance observer error:', error)
            }
        })
    }

    getMetrics(name?: string): PerformanceMetrics[] {
        if (name) {
            return this.metrics.filter(m => m.name === name)
        }
        return [...this.metrics]
    }

    getAverageTime(name: string): number | null {
        const metrics = this.getMetrics(name)
        if (metrics.length === 0) return null
        
        const total = metrics.reduce((sum, m) => sum + m.duration, 0)
        return total / metrics.length
    }

    clearMetrics(): void {
        this.metrics = []
    }

    generateReport(): string {
        const report: Record<string, { count: number; avgTime: number; totalTime: number; maxTime: number; minTime: number }> = {}
        
        this.metrics.forEach(metric => {
            if (!report[metric.name]) {
                report[metric.name] = {
                    count: 0,
                    avgTime: 0,
                    totalTime: 0,
                    maxTime: 0,
                    minTime: Infinity
                }
            }
            
            const r = report[metric.name]
            r.count++
            r.totalTime += metric.duration
            r.maxTime = Math.max(r.maxTime, metric.duration)
            r.minTime = Math.min(r.minTime, metric.duration)
            r.avgTime = r.totalTime / r.count
        })
        
        let output = '=== Performance Report ===\n'
        Object.entries(report).forEach(([name, stats]) => {
            output += `${name}:\n`
            output += `  Count: ${stats.count}\n`
            output += `  Avg Time: ${stats.avgTime.toFixed(2)}ms\n`
            output += `  Total Time: ${stats.totalTime.toFixed(2)}ms\n`
            output += `  Min Time: ${stats.minTime.toFixed(2)}ms\n`
            output += `  Max Time: ${stats.maxTime.toFixed(2)}ms\n\n`
        })
        
        return output
    }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Decorator for measuring method performance
export function measurePerformance(name?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value
        const measureName = name || `${target.constructor.name}.${propertyKey}`
        
        descriptor.value = function (...args: any[]) {
            return performanceMonitor.measure(measureName, () => originalMethod.apply(this, args))
        }
        
        return descriptor
    }
}

// Utility functions
export function measureDOMQueries<T>(name: string, fn: () => T): T {
    return performanceMonitor.measure(`dom-query-${name}`, fn)
}

export function measureAPICall<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return performanceMonitor.measure(`api-${name}`, fn)
}

// Memory leak detection utilities
interface ComponentMemoryTracker {
    component: string
    instances: Set<WeakRef<any>>
    created: number
    destroyed: number
}

class MemoryLeakDetector {
    private static instance: MemoryLeakDetector
    private trackers: Map<string, ComponentMemoryTracker> = new Map()
    private checkInterval: NodeJS.Timeout | null = null

    static getInstance(): MemoryLeakDetector {
        if (!MemoryLeakDetector.instance) {
            MemoryLeakDetector.instance = new MemoryLeakDetector()
        }
        return MemoryLeakDetector.instance
    }

    trackComponent(name: string, instance: any): void {
        if (!this.trackers.has(name)) {
            this.trackers.set(name, {
                component: name,
                instances: new Set(),
                created: 0,
                destroyed: 0
            })
        }

        const tracker = this.trackers.get(name)!
        tracker.instances.add(new WeakRef(instance))
        tracker.created++
    }

    untrackComponent(name: string): void {
        const tracker = this.trackers.get(name)
        if (tracker) {
            tracker.destroyed++
        }
    }

    startMonitoring(intervalMs: number = 30000): void {
        if (this.checkInterval) return

        this.checkInterval = setInterval(() => {
            this.checkForLeaks()
        }, intervalMs)
    }

    stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval)
            this.checkInterval = null
        }
    }

    private checkForLeaks(): void {
        this.trackers.forEach((tracker, name) => {
            // Clean up dead references
            const aliveInstances = new Set<WeakRef<any>>()
            tracker.instances.forEach(ref => {
                if (ref.deref()) {
                    aliveInstances.add(ref)
                }
            })
            
            tracker.instances = aliveInstances
            const currentlyAlive = tracker.instances.size
            const potentialLeaks = tracker.created - tracker.destroyed - currentlyAlive

            if (potentialLeaks > 10) {
                console.warn(`Potential memory leak in ${name}: ${potentialLeaks} instances may be leaking`)
            }
        })
    }

    getReport(): string {
        let report = '=== Memory Leak Detection Report ===\n'
        
        this.trackers.forEach((tracker, name) => {
            const alive = tracker.instances.size
            const potentialLeaks = tracker.created - tracker.destroyed - alive
            
            report += `${name}:\n`
            report += `  Created: ${tracker.created}\n`
            report += `  Destroyed: ${tracker.destroyed}\n`
            report += `  Currently Alive: ${alive}\n`
            report += `  Potential Leaks: ${potentialLeaks}\n\n`
        })
        
        return report
    }
}

export const memoryLeakDetector = MemoryLeakDetector.getInstance()