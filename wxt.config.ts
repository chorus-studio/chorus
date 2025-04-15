import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    extensionApi: 'chrome',
    modules: ['@wxt-dev/module-svelte'],
    alias: {
        $lib: 'src/lib'
    },
    manifest: {
        short_name: 'chorus BETA',
        name: 'Chorus - Spotify Enhancer BETA',
        description:
            'Enhance Spotify with controls to save favourite snips, auto-skip tracks, and set global and custom speed. More to come!',
        web_accessible_resources: [
            {
                resources: [
                    '/media-override.js',
                    '/icon/*',
                    '/sounds/*',
                    '/processor.js',
                    '/pip/*',
                    '/content-scripts/*.css'
                ],
                matches: ['*://open.spotify.com/*']
            },
            {
                resources: ['pascoli.html', 'burke.js'],
                matches: ['<all_urls>']
            }
        ],
        permissions: [
            'storage',
            'activeTab',
            'tabs',
            'scripting',
            'unlimitedStorage',
            'webRequest',
            'declarativeNetRequest'
        ],
        host_permissions: ['*://*.spotify.com/*'],
        optional_host_permissions: ['https://*/*'],
        optional_permissions: ['notifications', 'declarativeNetRequestWithHostAccess'],
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
            }
        }
    }
})
