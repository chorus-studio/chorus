import { defineConfig, UserManifest } from 'wxt'

const BASE_PERMISSIONS = [
    'storage',
    'activeTab',
    'tabs',
    'scripting',
    'unlimitedStorage',
    'webRequest',
    'declarativeNetRequest'
]

const perBrowserManifest: Record<string, UserManifest> = {
    chrome: {
        permissions: BASE_PERMISSIONS,
        optional_permissions: ['notifications', 'declarativeNetRequestWithHostAccess']
    },
    firefox: {
        permissions: [...BASE_PERMISSIONS, 'notifications', 'declarativeNetRequestWithHostAccess'],
        browser_specific_settings: {
            gecko: {
                id: 'chorus@cdrani.dev'
            }
        }
    }
}

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    extensionApi: 'chrome',
    modules: ['@wxt-dev/module-svelte'],
    alias: {
        $lib: 'src/lib'
    },
    manifest: ({ browser }) => ({
        short_name: 'chorus',
        name: 'Chorus - Spotify Enhancer',
        description:
            'Enhance Spotify with controls to save favourite snips, auto-skip tracks, and set global and custom speed. More to come!',
        web_accessible_resources: [
            {
                resources: [
                    '/media-override.js',
                    '/router.js',
                    '/icon/*',
                    '/sounds/*',
                    '/processor.js',
                    '/soundtouch.js',
                    '/content-scripts/chorus.css'
                ],
                matches: ['*://open.spotify.com/*']
            },
            {
                resources: ['pascoli.html', 'meucci.js'],
                matches: ['<all_urls>']
            }
        ],
        ...perBrowserManifest[browser],
        host_permissions: ['*://*.spotify.com/*'],
        optional_host_permissions: ['<all_urls>'],
        commands: {
            'on/off': {
                description: 'Toggle Extension On/Off'
            },
            loop: {
                description: 'Loop/UnLoop Snip/Track'
            },
            next: {
                description: 'Next Track'
            },
            'play/pause': {
                description: 'Play/Pause'
            },
            repeat: {
                description: 'Repeat Track'
            },
            shuffle: {
                description: 'Shuffle Tracks'
            },
            previous: {
                description: 'Previous Track'
            },
            settings: {
                description: 'Display Controls'
            },
            'mute/unmute': {
                description: 'Mute/Unmute Track'
            },
            'seek-forward': {
                description: 'Seek Track Forwards'
            },
            'save/unsave': {
                description: 'Save/Unsave Track'
            },
            'seek-rewind': {
                description: 'Seek Track Backwards'
            },
            'block-track': {
                description: 'Add track to block list'
            },
            'show-track': {
                description: 'Show current track as a notification'
            },
            'toggle-new-releases': {
                description: 'Toggle New Releases View'
            }
        }
    })
})
