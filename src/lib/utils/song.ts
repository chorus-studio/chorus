import { timeToSeconds } from './time'

const getImage = (imageSrc: string) => {
    if (!imageSrc) return undefined

    return imageSrc?.replace('4851', 'b273')
}

export type CurrentSongInfo = {
    id?: string
    cover?: string
    type: string
    track_id: string
    url: string
}

export const currentSongInfo = (): CurrentSongInfo => {
    const songLabel = document
        .querySelector('[data-testid="now-playing-widget"]')
        ?.getAttribute('aria-label')
    const image = document.querySelector(
        '[data-testid="CoverSlotCollapsed__container"] img'
    ) as HTMLImageElement
    const anchor = document.querySelector(
        '[data-testid="now-playing-widget"] a'
    ) as HTMLAnchorElement

    // Remove 'Now playing: ' prefix
    const id = songLabel?.split('Now playing: ')?.at(1)
    const cover = getImage(image?.src)

    const [, type, track_id] = new URL(anchor?.href).pathname.split('/')

    return {
        id,
        cover,
        type: type ?? 'track',
        track_id,
        url: anchor.href
    }
}

export type TrackSongInfo = TrackIdInfo & {
    id?: string
    title?: string | null
    artists?: string
    cover?: string
    endTime?: number
    startTime?: number
}

export const trackSongInfo = (row: Element): TrackSongInfo | null => {
    const title =
        row?.querySelector('a > div')?.textContent ||
        row?.querySelector('div[data-encore-id="type"]')?.textContent
    const songLength = row?.querySelector(
        'button[data-encore-id="buttonTertiary"] + div'
    )?.textContent
    const image =
        (row?.querySelector('img') as HTMLImageElement) ||
        (document.querySelector('button > div img') as HTMLImageElement)

    if (!songLength) return null

    const artists = getArtists(row)
    const trackInfo = getTrackId(row)

    return {
        title,
        startTime: 0,
        artists: getArtists(row),
        cover: getImage(image?.src),
        id: `${title} by ${artists}`,
        endTime: timeToSeconds(songLength),
        ...(trackInfo && { ...trackInfo })
    }
}

export type TrackIdInfo = {
    url?: string
    track_id?: string
} | null

export const getTrackId = (row: Element): TrackIdInfo | null => {
    const trackIdUrl = (
        row.querySelector('a[data-testid="internal-track-link"], a') as HTMLAnchorElement
    )?.href
    if (!trackIdUrl) return null

    const url = trackIdUrl.split('.com').at(1)
    return { url: trackIdUrl, track_id: url?.split('/').at(2) ?? '' }
}

const getArtists = (row: Element): string => {
    const artistsList = row.querySelectorAll('span > div > a, span > span > a')

    // Here means we are at artist or song page and can get artist from Banner
    if (!artistsList.length) {
        const artistInBanner = document.querySelector('span > a[data-testid="creator-link"]')
        if (artistInBanner) return (artistInBanner as HTMLAnchorElement).innerText

        return document.querySelector('span[data-testid="entityTitle"] > h1')?.textContent || ''
    }

    return Array.from(artistsList)
        .filter((artist) => (artist as HTMLAnchorElement).href.includes('artist'))
        .map((artist) => (artist as HTMLAnchorElement).textContent)
        .join(', ')
}
