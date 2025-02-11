import VideoOverride from './video-override.js'

export default class VideoElement {
    constructor({ video, reverb, equalizer }) {
        this._video = video
        this._reverb = reverb
        this._equalizer = equalizer
        this._video.crossOrigin = 'anonymous'
        this._videoOverride = new VideoOverride(this)
    }

    set active(value) {
        this._active = value
        if (navigator.userAgent.includes('Firefox')) return

        const eqEffect = sessionStorage.getItem('equalizer') ?? 'none'
        const reverbEffect = sessionStorage.getItem('reverb') ?? 'none'

        if ([eqEffect, reverbEffect].every((effect) => effect == 'none')) {
            this._reverb.disconnect()
            this._equalizer.disconnect()
            return
        }

        const isReverb = this._reverb.isAPreset(reverbEffect)
        isReverb
            ? this._reverb.setReverbEffect(reverbEffect)
            : this._equalizer.setEQEffect(eqEffect)
    }

    get active() {
        return this._active
    }

    reset() {
        this.clearCurrentSpeed()
        this.resetTempTimes()
        this.playbackRate = 1
        this.preservesPitch = true
    }

    resetTempTimes() {
        this._video.removeAttribute('endTime')
        this._video.removeAttribute('startTime')
        this._video.removeAttribute('lastSetThumb')
    }

    get element() {
        return this._video
    }

    set currentTime(value) {
        if (this._video) this._video.currentTime = value
    }

    get currentTime() {
        return this._video?.currentTime
    }

    clearCurrentSpeed() {
        this._video.removeAttribute('currentSpeed')
    }

    set preservesPitch(value) {
        if (this._video) this._video.preservesPitch = value
    }

    get currentSpeed() {
        return this._video.getAttribute('currentSpeed')
    }

    set currentSpeed(value) {
        this._video.setAttribute('currentSpeed', value)
    }

    get preservesPitch() {
        return this._video ? this._video.preservesPitch : true
    }

    set playbackRate(value) {
        this._video.playbackRate = this._active ? { source: 'chorus', value } : value
    }

    get playbackRate() {
        return this._video ? this._video.playbackRate : 1
    }
}
