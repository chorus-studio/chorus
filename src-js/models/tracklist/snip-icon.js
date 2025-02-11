import TrackListIcon from './tracklist-icon.js'
import { SNIP_ICON, createIcon } from '../../components/icons/icon.js'

export default class SnipIcon extends TrackListIcon {
    constructor(store) {
        super({
            store,
            key: 'isSnip',
            selector: 'button[role="snip"]'
        })
    }

    setInitialState(row) {
        super._setInitialState(row)
    }

    setUI(row) {
        super._setUI(row)
    }

    // FIXME: click on snip-icon in tracklist doe not close settings modal
    get _iconUI() {
        return createIcon(SNIP_ICON)
    }
}
