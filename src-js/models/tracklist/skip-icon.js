import TrackListIcon from './tracklist-icon.js'
import { SKIP_ICON, createIcon } from '../../components/icons/icon.js'

export default class SkipIcon extends TrackListIcon {
    constructor(store) {
        super({
            store,
            key: 'isSkipped',
            selector: 'button[role="skip"]'
        })
    }

    setInitialState(row) {
        super._setInitialState(row)
    }

    setUI(row) {
        super._setUI(row)
    }

    get _iconUI() {
        return createIcon(SKIP_ICON)
    }
}
