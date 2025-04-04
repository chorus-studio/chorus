import Mellowtel from 'mellowtel'

class MellowtelUtils {
    private mellowtel: Mellowtel

    constructor() {
        this.mellowtel = new Mellowtel('6498e4a8', { disableLogs: false })
    }

    async initPascoli() {
        return await this.mellowtel.initPascoli()
    }

    async initBurke() {
        return await this.mellowtel.initBurke()
    }

    async generateSettingsLink() {
        return await this.mellowtel.generateSettingsLink()
    }

    async initBackground() {
        return await this.mellowtel.initBackground()
    }

    async generateAndOpenOptInLink() {
        return await this.mellowtel.generateAndOpenOptInLink()
    }

    async initContentScript() {
        return await this.mellowtel.initContentScript('pascoli.html', 'burke.js')
    }

    async optOut() {
        return await this.mellowtel.optOut()
    }

    async optIn() {
        return await this.mellowtel.optIn()
    }

    async start() {
        return await this.mellowtel.start()
    }

    async getOptInStatus() {
        return await this.mellowtel.getOptInStatus()
    }
}

export const mellowtel = new MellowtelUtils()
