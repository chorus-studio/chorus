import Alert from '../models/alert.js'
import Dispatcher from '../events/dispatcher.js'
import { parseNodeString } from '../utils/parser.js'

const alert = new Alert()
const dispatcher = new Dispatcher()

const createArtistDiscoUI = () => `
    <div 
        id="artist-disco"
        style="display:flex;align-items:center;"
    >
        <button 
            role="artist-disco"
            id="artist-disco-button"
            aria-label="Create Artist Discograpy Playlist"
            style="position:absolute;border:none;background:unset;display:flex;align-items:center;cursor:pointer;"
        >
            <svg 
                width="1.5rem"
                height="1.5rem"
                stroke-width="0.5"
                viewBox="0 0 17 16"
                xmlns="http://www.w3.org/2000/svg"
            >
                <g 
                    fill="#1ed760"
                    fill-rule="evenodd"
                    transform="translate(1)"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g transform="translate(6 6)">
                        <path d="m4 6h5.938v1.969h-5.938z"/>
                        <path d="m6 4h1.97v5.938h-1.97z"/>
                        <path d="m1.988.022c-1.096 0-1.979.886-1.979 1.977 0 1.092.884 1.976 1.979 1.976 1.091 0 1.979-.884 1.979-1.976 0-1.091-.888-1.977-1.979-1.977z"/>
                    </g>
                    <path d="m15.958 7.969c0-4.413-3.573-7.906-7.979-7.906s-7.979 3.493-7.979 7.906c0 4.412 3.572 7.989 7.979 7.989.34 0 .674-.026 1.001-.071v-4.935c-.308.106-.635.173-.979.173-1.721 0-3.115-1.406-3.115-3.14 0-1.735 1.395-3.142 3.115-3.142 1.719 0 3.115 1.406 3.115 3.142 0 .356-.072.695-.182 1.015h4.933c.053-.348.091-.693.091-1.031zm-10.808 3.707-1.518 1.518-.868-.869 1.518-1.518zm6.462-6.399-.869-.869 1.518-1.518.869.869z"/>
                </g>
            </svg>
        </button>
    </div>
`

function addArtistDiscoUI() {
    const discoUI = parseNodeString(createArtistDiscoUI())
    document.querySelector('[data-testid="action-bar-row"]')?.appendChild(discoUI)

    const button = document.getElementById('artist-disco-button')
    button.addEventListener('click', sendArtistDiscoMessage)
}

async function sendArtistDiscoMessage() {
    const artist_id = location.pathname.split('/artist/').at(-1)
    const artist_name = document.querySelector('span > h1').textContent

    const { state, data } = await dispatcher.sendEvent({
        eventType: 'artist.disco',
        detail: { key: 'artist.disco', values: { artist_name, artist_id } }
    })

    if (state == 'completed') {
        const alertMessage = `Playlist "${artist_name}" Added.`
        alert.displayAlert({
            type: 'success',
            message: alertMessage,
            duration: 5000,
            link: data.playlist.url
        })
        return
    }

    const alertMessage = 'Something is wrong. Uh... Please Try Again.'
    alert.displayAlert({ type: 'error', message: alertMessage })
}

function loadArtistDiscoUI() {
    const setup = setInterval(() => {
        const actionBar = document.querySelector('[data-testid="action-bar"]')
        const discoUI = document.getElementById('artist-disco')

        if (actionBar && discoUI) {
            clearInterval(setup)
            return
        }
        if (actionBar && !discoUI) addArtistDiscoUI()
    }, 0)
}

export { loadArtistDiscoUI }
