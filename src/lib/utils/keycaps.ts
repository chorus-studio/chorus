/**
 * The keys of a bound combo, one per keycap. Chrome and Firefox print
 * "Alt+Shift+1"; Chrome on macOS prints a run of glyphs, "⇧⌘P", where each
 * modifier is its own key and whatever follows them is the last one.
 */
const MAC_MODIFIERS = new Set(['⌃', '⌥', '⇧', '⌘'])

export function shortcutKeys(combo: string): string[] {
    const trimmed = combo.trim()
    if (trimmed.includes('+')) {
        return trimmed
            .split('+')
            .map((k) => k.trim())
            .filter(Boolean)
    }
    const keys: string[] = []
    let rest = trimmed
    while (rest && MAC_MODIFIERS.has(rest[0]!)) {
        keys.push(rest[0]!)
        rest = rest.slice(1)
    }
    if (rest) keys.push(rest)
    return keys
}
