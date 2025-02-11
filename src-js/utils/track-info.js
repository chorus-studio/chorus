import { parseNodeString } from './parser.js'

const ANCHOR_TEXT = 'Open Spotify Tab'

function getTextNode({ text, isShortText }) {
    const childText =
        text == ANCHOR_TEXT
            ? `<a id="spotify-tab" href="https://open.spotify.com" target="_blank">${text}</a>`
            : text
    const shortTextHtml = `<p>${childText}</p>`
    const displayText = isShortText
        ? shortTextHtml
        : `<div>${shortTextHtml}&ensp;&bullet;&ensp;${shortTextHtml}&ensp;&centerdot;&ensp;</div>`

    return parseNodeString(displayText)
}

function setSpotifyAnchorColour(textColour) {
    const anchor = document.getElementById('spotify-tab')
    if (!anchor) return

    anchor.style.color = textColour
}

function setNowPlayingTextElement({ element, text, textColour, chorusView }) {
    const isShortText = text.length < (chorusView ? 43 : 25)
    const textNode = getTextNode({ isShortText, text })

    element.replaceChildren(textNode)
    element.style.color = textColour
    setSpotifyAnchorColour(textColour)

    isShortText ? element.classList.remove('marquee') : element.classList.add('marquee')
}

export function setTrackInfo({ title, artists, textColour = '#000', chorusView = false }) {
    if (!title || !artists) return

    const titleElement = document.getElementById('track-title')
    const artistsElement = document.getElementById('track-artists')

    setNowPlayingTextElement({
        element: titleElement,
        text: title,
        textColour: chorusView ? '#fff' : textColour,
        chorusView
    })
    setNowPlayingTextElement({
        element: artistsElement,
        text: artists,
        textColour: chorusView ? '#b3b3b3' : textColour,
        chorusView
    })
}
