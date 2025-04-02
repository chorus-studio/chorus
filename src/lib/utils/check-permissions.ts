import { defineProxyService } from '@webext-core/proxy-service'

export interface CheckPermissionsService {
    checkHasPermission(): Promise<boolean>
    verifyPermission(): Promise<boolean>
}

export class CheckPermissionsService implements CheckPermissionsService {
    async checkHasPermission() {
        try {
            return await browser.permissions.contains({
                permissions: ['declarativeNetRequestWithHostAccess']
            })
        } catch (error) {
            console.error('Failed to check permission:', error)
            return false
        }
    }

    async verifyPermission() {
        try {
            return await browser.permissions.request({
                permissions: ['declarativeNetRequestWithHostAccess']
            })
        } catch (error) {
            console.error('Failed to verify permission:', error)
            return false
        }
    }
}

export const [registerCheckPermissionsService, getCheckPermissionsService] = defineProxyService(
    'CheckPermissionsService',
    () => new CheckPermissionsService()
)
