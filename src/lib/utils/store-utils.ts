/**
 * Ensures that an object has the same keys as a template object.
 * If a key exists in the object but not in the template, it will be removed.
 * If a key exists in the template but not in the object, it will be added with the template's value.
 * If a key's type doesn't match the template (e.g. array vs non-array), it will use the template's value.
 * Handles nested objects recursively.
 */
export function syncWithType<T extends Record<string, any>>(obj: T, template: T): T {
    const result = { ...obj }

    // Remove keys that don't exist in the template
    for (const key in result) {
        if (!(key in template)) {
            delete result[key]
        } else if (Array.isArray(result[key]) !== Array.isArray(template[key])) {
            // If array type doesn't match, use template value
            result[key] = template[key]
        } else if (Array.isArray(result[key]) && Array.isArray(template[key])) {
            // If both are arrays, keep the result array
            continue
        } else if (
            typeof result[key] === 'object' &&
            result[key] !== null &&
            typeof template[key] === 'object' &&
            template[key] !== null
        ) {
            // Special handling for releases property
            if (key === 'releases') {
                // Keep the existing releases if they exist
                continue
            }
            // For other objects containing arrays, we need to handle them specially
            if (
                Object.values(result[key]).some((v) => Array.isArray(v)) &&
                Object.values(template[key]).some((v) => Array.isArray(v))
            ) {
                // Keep the result object if it has the same structure
                continue
            }
            // Recursively sync nested objects
            result[key] = syncWithType(result[key], template[key])
        }
    }

    // Add missing keys from the template
    for (const key in template) {
        if (!(key in result)) {
            result[key] = template[key]
        } else if (Array.isArray(result[key]) !== Array.isArray(template[key])) {
            // If array type doesn't match, use template value
            result[key] = template[key]
        } else if (Array.isArray(result[key]) && Array.isArray(template[key])) {
            // If both are arrays, keep the result array
            continue
        } else if (
            typeof result[key] === 'object' &&
            result[key] !== null &&
            typeof template[key] === 'object' &&
            template[key] !== null
        ) {
            // Special handling for releases property
            if (key === 'releases') {
                // Keep the existing releases if they exist
                continue
            }
            // For other objects containing arrays, we need to handle them specially
            if (
                Object.values(result[key]).some((v) => Array.isArray(v)) &&
                Object.values(template[key]).some((v) => Array.isArray(v))
            ) {
                // Keep the result object if it has the same structure
                continue
            }
            // Recursively sync nested objects
            result[key] = syncWithType(result[key], template[key])
        }
    }

    return result
}
