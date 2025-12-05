import packageJson from '../../../package.json'

/**
 * Get the extension version from package.json
 * This returns the full semantic version including pre-release tags (e.g., "2.8.0-beta.1")
 *
 * We use package.json instead of chrome.runtime.getManifest().version because
 * Chrome Manifest V3 only supports numeric versions (e.g., "2.8.0") and strips
 * pre-release identifiers like "-beta.1"
 */
export function getVersion(): string {
    return packageJson.version
}
