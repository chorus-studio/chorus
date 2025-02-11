import { timeToSeconds } from './time.js'

const getImage = (imageSrc) => {
    if (!imageSrc) return undefined

    return imageSrc?.replace('4851', 'b273')
}

export const currentSongInfo = () => {
    const songLabel = document
        .querySelector('[data-testid="now-playing-widget"]')
        ?.getAttribute('aria-label')
    const image = document.querySelector('[data-testid="CoverSlotCollapsed__container"] img')
    const anchor = document.querySelector('[data-testid="now-playing-widget"] a')

    // Remove 'Now playing: ' prefix
    const id = songLabel?.split('Now playing: ')?.at(1)
    const cover = getImage(image?.src)

    const [, type, trackId] = new URL(anchor?.href).pathname.split('/')

    return {
        id,
        cover,
        type: type ?? 'track',
        trackId,
        url: anchor.href
    }
}

export const trackSongInfo = (row) => {
    const title =
        row?.querySelector('a > div')?.textContent ||
        row?.querySelector('div[data-encore-id="type"]')?.textContent
    const songLength = row?.querySelector(
        'button[data-encore-id="buttonTertiary"] + div'
    )?.textContent
    const image = row?.querySelector('img') || document.querySelector('button > div img')

    if (!songLength) return

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

export const getTrackId = (row) => {
    const trackIdUrl = row.querySelector('a[data-testid="internal-track-link"], a')?.href
    if (!trackIdUrl) return

    const url = trackIdUrl.split('.com').at(1)
    return { url: trackIdUrl, trackId: url.split('/').at(2) }
}

const getArtists = (row) => {
    const artistsList = row.querySelectorAll('span > div > a, span > span > a')

    // Here means we are at artist or song page and can get artist from Banner
    if (!artistsList.length) {
        const artistInBanner = document.querySelector('span > a[data-testid="creator-link"]')
        if (artistInBanner) return artistInBanner.innerText

        return document.querySelector('span[data-testid="entityTitle"] > h1')?.textContent || ''
    }

    return Array.from(artistsList)
        .filter((artist) => artist.href.includes('artist'))
        .map((artist) => artist.textContent)
        .join(', ')
}
