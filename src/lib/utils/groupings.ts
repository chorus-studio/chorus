export function groupBy<T extends Record<string, any>>(
    array: T[],
    key: string
): Record<string, T[]> {
    return array.reduce<Record<string, T[]>>((acc, item) => {
        const groupKey = key.split('.').reduce<any>((obj, k) => obj?.[k], item)
        const keyStr = String(groupKey ?? 'undefined')

        if (!acc[keyStr]) {
            acc[keyStr] = []
        }
        acc[keyStr].push(item)
        return acc
    }, {})
}
