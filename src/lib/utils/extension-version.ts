/** The installed extension's version, for the files Chorus writes; `dev` outside an extension. */
export function extensionVersion(): string {
    try {
        return chrome.runtime.getManifest().version
    } catch {
        return 'dev'
    }
}
