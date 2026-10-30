import type { AutoSkip } from '$lib/stores/config'

/**
 * Why a track is skipped before it plays: an artist on the blocked list
 * (always, like a blocked track), a keyword rule, or a length rule (the last
 * two only while auto-skip is on).
 */
export type SkipReason = 'artist' | 'keyword' | 'short'

export type TrackFacts = {
    title?: string | null
    /** Every artist on the track, joined with ", " as the player bar reads them. */
    artist?: string | null
    /** Seconds; 0 or null when not known yet. */
    duration?: number | null
}

const normalizeName = (name: string) => name.trim().toLocaleLowerCase()

/** The artists named in a "A, B" string, trimmed, blanks dropped. */
export const artistsOf = (artist?: string | null): string[] =>
    (artist ?? '')
        .split(', ')
        .map((name) => name.trim())
        .filter(Boolean)

/** True when one of the track's artists is on the list (exact name, case ignored). */
export function matchesBlockedArtist(blocked: string[] | undefined, artist?: string | null) {
    if (!blocked?.length) return false
    const names = new Set(blocked.map(normalizeName))
    return artistsOf(artist).some((name) => names.has(normalizeName(name)))
}

/** The pattern a keyword rule means; a keyword that is not a valid pattern matches literally. */
function keywordTest(rules: AutoSkip, keyword: string): (text: string) => boolean {
    let pattern = keyword
    if (rules.match_exact_words) pattern = `^${pattern}$`
    else if (rules.match_whole_words) pattern = `\\b${pattern}\\b`
    try {
        const regex = new RegExp(pattern, rules.case_sensitive ? '' : 'i')
        return (text) => regex.test(text)
    } catch {
        return rules.case_sensitive
            ? (text) => text.includes(keyword)
            : (text) => text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
    }
}

export function skipReason(rules: AutoSkip, facts: TrackFacts): SkipReason | null {
    if (matchesBlockedArtist(rules.artists, facts.artist)) return 'artist'
    if (!rules.enabled) return null

    const title = facts.title ?? ''
    const artist = facts.artist ?? ''
    if (title && artist) {
        if (rules.title_keywords.some((keyword) => keywordTest(rules, keyword)(title))) {
            return 'keyword'
        }
        const artists = artistsOf(artist)
        if (
            rules.artist_keywords.some((keyword) => {
                const test = keywordTest(rules, keyword)
                return artists.some((name) => test(name))
            })
        ) {
            return 'keyword'
        }
    }

    const min = rules.min_seconds ?? 0
    const duration = facts.duration ?? 0
    if (min > 0 && duration > 0 && duration < min) return 'short'
    return null
}
