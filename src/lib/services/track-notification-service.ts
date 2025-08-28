import { get } from 'svelte/store'
import { settingsStore } from '$lib/stores/settings'
import { getNotificationService, type NotificationService } from '$lib/utils/notifications'
import type { NowPlaying } from '$lib/stores/now-playing'

/**
 * Manages track change notifications
 * Single responsibility: Track notification management
 */
export class TrackNotificationService {
    private notificationService: NotificationService
    private currentTrackId: string | null = null
    private songChangeTimeout: NodeJS.Timeout | null = null

    constructor() {
        this.notificationService = getNotificationService()
    }

    async showTrackChangeNotification(songInfo: NowPlaying): Promise<void> {
        if (this.songChangeTimeout) {
            clearTimeout(this.songChangeTimeout)
        }

        const settings = get(settingsStore)
        const shouldShowNotification = settings.notifications.enabled && 
                                     settings.notifications.on_track_change

        if (!shouldShowNotification) return

        this.songChangeTimeout = setTimeout(async () => {
            if (!this.currentTrackId || songInfo.id !== this.currentTrackId) {
                await this.notificationService.showNotification(songInfo)
                this.currentTrackId = songInfo.id
            }
        }, 5_000)
    }

    cleanup(): void {
        if (this.songChangeTimeout) {
            clearTimeout(this.songChangeTimeout)
            this.songChangeTimeout = null
        }
    }
}