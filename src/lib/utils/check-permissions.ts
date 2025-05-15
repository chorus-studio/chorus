import { defineProxyService } from '@webext-core/proxy-service'

export interface CheckPermissionsService {
    checkHasPermission(permission: string): Promise<boolean>
    verifyPermission(permission: string): Promise<boolean>
}

export class CheckPermissionsService implements CheckPermissionsService {
    async checkHasPermission(permission: string) {
        try {
            return await browser.permissions.contains({
                permissions: [permission]
            })
        } catch (error) {
            console.error('Failed to check permission:', error)
            return false
        }
    }

    async verifyPermission(permission: string) {
        try {
            return await browser.permissions.request({
                permissions: [permission]
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
