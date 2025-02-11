import { store } from '../../stores/data.js'
import { spotifyVideo } from '../../actions/overload.js'
import { clickOutside } from '../../utils/click-outside.js'
import { spotifyPresets } from '../../lib/equalizer/presets.js'

export default class EqualizerController {
    constructor() {
        this._store = store
        this._clickOutsideHandlers = []
        this._equalizer = spotifyVideo.equalizer
    }

    init() {
        const effect = this._store.getEqualizer() ?? 'none'
        this.#setupEvents(effect)
    }

    #setBtnBackground(e) {
        const isMouseOver = e.type == 'mouseover'
        this.style.background = isMouseOver ? '#3e3d3d' : '#171717'
    }

    #setupButtonListeners = (button) => {
        button.addEventListener('click', this.#handleSelection)
        button.addEventListener('mouseover', this.#setBtnBackground)
        button.addEventListener('mouseleave', this.#setBtnBackground)
    }

    #highlightFirstVisibleBtn({ isSpotify, effectList }) {
        const { spotifyEffect, customEffect } = this.elements
        const selectedEffect = isSpotify ? spotifyEffect.textContent : customEffect.textContent
        const selectedBtn = effectList.querySelector(`button[value="${selectedEffect}"]`)

        effectList.scrollTop = selectedBtn.offsetTop - effectList.offsetTop
        selectedBtn.style.background = '#3e3d3d'
    }

    #resetBtnBackgrounds() {
        const { spotifyList, customList } = this.elements
        const reset = (btn) => (btn.style.background = '#171717')
        ;[...spotifyList.children].forEach(reset)
        ;[...customList.children].forEach(reset)
    }

    #toggleListView = (e) => {
        e.preventDefault()
        const { spotifyList, customList } = this.elements

        const isSpotify = e.target.id.startsWith('spotify')
        const effectList = isSpotify ? spotifyList : customList
        const otherList = isSpotify ? customList : spotifyList

        const isShowing = effectList.style.display == 'flex'
        effectList.style.display = isShowing ? 'none' : 'flex'
        otherList.style.display = 'none'

        if (effectList.style.display !== 'flex') return

        this.#resetBtnBackgrounds()
        this.#highlightFirstVisibleBtn({ isSpotify, effectList })
    }

    #setupToggleBtnEvents(btn) {
        const clickHandler = clickOutside({ area: '#chorus-controls', node: btn })
        this._clickOutsideHandlers.push(clickHandler)

        btn.addEventListener('click', this.#toggleListView)
        btn.addEventListener('click_outside', () => {
            btn.nextElementSibling.style.display = 'none'
        })
    }

    destroyClickHandlers() {
        this._clickOutsideHandlers.forEach((handler) => handler?.destroy())
        this._clickOutsideHandlers = []

        this.#closeLists()
    }

    #closeLists() {
        const { spotifyList, customList } = this.elements
        if (!spotifyList || !customList) return

        customList.style.display = 'none'
        spotifyList.style.display = 'none'
    }

    #setupSelectEvents() {
        const { spotifyBtn, spotifyList, customBtn, customList } = this.elements

        this.#setupToggleBtnEvents(spotifyBtn)
        ;[...spotifyList.children].forEach(this.#setupButtonListeners)

        this.#setupToggleBtnEvents(customBtn)
        ;[...customList.children].forEach(this.#setupButtonListeners)
    }

    #setupEvents(effect) {
        const { spotifyEffect, customEffect, presetSelection } = this.elements

        if (effect == 'none') {
            this.setValuesToNone()
        } else {
            presetSelection.textContent = effect
            const selectedElement = spotifyPresets.includes(effect) ? spotifyEffect : customEffect
            selectedElement.textContent = effect
        }

        this.#setupSelectEvents()
    }

    get elements() {
        return {
            spotifyBtn: document.getElementById('spotify-equalizer-btn'),
            spotifyList: document.getElementById('spotify-equalizer-list'),
            spotifyEffect: document.getElementById('spotify-equalizer-selected'),

            customBtn: document.getElementById('custom-equalizer-btn'),
            customList: document.getElementById('custom-equalizer-list'),
            customEffect: document.getElementById('custom-equalizer-selected'),

            presetSelection: document.getElementById('equalizer-preset-selection')
        }
    }

    #handleSelection = async (e) => {
        e.preventDefault()

        const value = e.target.value

        await this._equalizer.setEQEffect(value)

        const { presetSelection, spotifyEffect, customEffect } = this.elements
        const spotifyPresetUpdate = e.target?.parentElement?.id?.startsWith('spotify')

        customEffect.textContent = spotifyPresetUpdate ? 'none' : value
        spotifyEffect.textContent = spotifyPresetUpdate ? value : 'none'

        presetSelection.textContent = value

        this.#closeLists()
    }

    async saveSelection() {
        await this._store.saveEqualizer(this.elements.presetSelection.textContent)
    }

    setValuesToNone() {
        const { presetSelection, spotifyEffect, customEffect } = this.elements
        customEffect.textContent = 'none'
        spotifyEffect.textContent = 'none'
        presetSelection.textContent = 'none'
    }

    async clearEqualizer() {
        this.setValuesToNone()
        await this.saveSelection()
        await this._equalizer.setEQEffect('none')
    }
}
