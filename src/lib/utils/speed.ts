type SpeedParams = {
    key: string
    current: number
    value: number | string
}

export function padSpeed({ value, key }: Omit<SpeedParams, 'current'>): string {
    const defaultRate = typeof value === 'undefined' ? '1' : value?.toString()
    const parsedValue = parseFloat(defaultRate)
    if (isNaN(parsedValue)) return defaultRate

    // Use toFixed to ensure we get the exact number of decimal places
    const decimalPlace = key == 'rate' ? 3 : 2
    return parsedValue.toFixed(decimalPlace)
}

export function validateSpeed({ value, key, current }: SpeedParams): number {
    const parsedValue = parseFloat(value as string)
    if (isNaN(parsedValue)) return current

    if (key == 'semitone') return Math.max(-24, Math.min(24, parsedValue))

    return Math.max(0.25, Math.min(4, parsedValue))
}

export function getTitle(key: string) {
    if (key == 'semitone') return `key (-24 to 24)`
    return `${key} (0.25 to 4)`
}
