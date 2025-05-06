export function groupBy<T extends Record<string, any>, K extends keyof T>(
    array: T[],
    key: K
): Record<T[K], T[]> {
    return array.reduce(
        (acc, item) => {
            const groupKey = item[key]
            if (!acc[groupKey]) {
                acc[groupKey] = []
            }
            acc[groupKey].push(item)
            return acc
        },
        {} as Record<T[K], T[]>
    )
}
