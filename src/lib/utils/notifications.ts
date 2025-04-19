import { executeButtonClick } from './command'
import type { NowPlaying } from '$lib/stores/now-playing'
import { defineProxyService } from '@webext-core/proxy-service'

export async function showNotification(track: NowPlaying) {
    if (!track.title || !track.artist) return

    // Create a unique ID for each notification to replace previous ones
    const notificationId = 'chorus-track-notification'

    try {
        // Check if we have permission to show notifications
        const permission = await browser.permissions.contains({ permissions: ['notifications'] })
        if (!permission) {
            console.warn('Notification permission not granted')
            return
        }

        // Create the notification
        browser.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: track.cover || '/icon/48.png',
            title: track.title,
            message: `${track.artist}`,
            priority: 1,
            ...(import.meta.env.FIREFOX
                ? {}
                : {
                      silent: true,
                      buttons: [
                          { title: `${track?.liked ? 'Un' : ''}Like Track ` },
                          { title: 'Block' }
                      ]
                  })
        })

        browser.notifications.onButtonClicked.addListener(async (id, buttonIndex) => {
            if (id === notificationId) {
                if (buttonIndex === 0) {
                    await executeButtonClick({ command: 'save/unsave' })
                } else if (buttonIndex === 1) {
                    await executeButtonClick({ command: 'block-track' })
                    browser.notifications.clear(notificationId)
                }
            }
        })

        // Auto-close the notification after 5 seconds
        setTimeout(() => {
            browser.notifications.clear(notificationId)
        }, 5000)
    } catch (error) {
        console.error('Error creating notification:', error)
    }
}

export async function showTrackNotification(track: NowPlaying) {
    await showNotification(track)
}

export interface NotificationService {
    showNotification(track: NowPlaying): Promise<void>
}

export class NotificationService implements NotificationService {
    async showNotification(params: ShowNotificationParams) {
        await showNotification(params)
    }
}

export const [registerNotificationService, getNotificationService] = defineProxyService(
    'NotificationService',
    () => new NotificationService()
)
