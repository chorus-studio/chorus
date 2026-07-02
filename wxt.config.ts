import { defineConfig, UserManifest } from 'wxt'

const BASE_PERMISSIONS = [
    'storage',
    'activeTab',
    'tabs',
    'scripting',
    'unlimitedStorage',
    'webRequest'
]

// Vocal separation needs Chrome's offscreen document, which Firefox lacks. These
// public assets are dead weight in the Firefox build (~51MB model + ~24MB ORT wasm),
// so we strip them from it via the build:publicAssets hook below.
const VOCAL_PUBLIC_PREFIXES = ['models/', 'ort/', 'vocal-stream-worklet.js']

const perBrowserManifest: Record<string, UserManifest> = {
    chrome: {
        // offscreen + tabCapture power the real-time vocal remover (Chrome-only).
        permissions: [...BASE_PERMISSIONS, 'offscreen', 'tabCapture'],
        optional_permissions: ['notifications']
    },
    firefox: {
        permissions: [...BASE_PERMISSIONS, 'notifications'],
        browser_specific_settings: {
            gecko: {
                id: 'chorus@cdrani.dev',
                data_collection_permissions: {
                    required: ['none']
                }
            } as Record<string, unknown>
        }
    }
}

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    extensionApi: 'chrome',
    zip: {
        excludeSources: [
            '.claude/**/*',
            '.github/**/*',
            '.vscode/**/*',
            'license.md',
            '.output/**/*',
            'README.md',
            'CHANGELOG.md',
            'code_of_conduct.md'
        ]
    },
    modules: ['@wxt-dev/module-svelte'],
    alias: {
        $lib: 'src/lib'
    },
    hooks: {
        // Firefox has no chrome.offscreen, so the vocal-separation pipeline can't run
        // there. Strip its entrypoint + heavy assets so the Firefox build isn't bloated
        // by ~75MB of unusable binaries (51MB model + 24MB ORT wasm).
        'entrypoints:resolved'(wxt, entrypoints) {
            if (wxt.config.browser !== 'firefox') return
            const i = entrypoints.findIndex((e) => e.name === 'offscreen')
            if (i !== -1) entrypoints.splice(i, 1)
        },
        'build:publicAssets'(wxt, files) {
            if (wxt.config.browser !== 'firefox') return
            for (let i = files.length - 1; i >= 0; i--) {
                const dest = files[i].relativeDest.replace(/\\/g, '/')
                if (VOCAL_PUBLIC_PREFIXES.some((p) => dest === p || dest.startsWith(p))) {
                    files.splice(i, 1)
                }
            }
        }
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
                    '/ms-processor.js',
                    '/soundtouch.js',
                    '/content-scripts/*.css',
                    // Vocal-model assets are Chrome-only (offscreen pipeline); omit on Firefox.
                    ...(browser === 'firefox' ? [] : ['/models/*', '/ort/*'])
                ],
                matches: ['*://open.spotify.com/*']
            }
        ],
        // onnxruntime-web compiles WASM in the isolated content-script world;
        // that requires 'wasm-unsafe-eval' in the extension's own CSP.
        content_security_policy: {
            extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
        },
        ...perBrowserManifest[browser],
        host_permissions: ['*://*.spotify.com/*'],
        commands: {
            'on/off': {
                suggested_key: { default: 'Alt+Shift+O' },
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
                suggested_key: { default: 'Alt+Shift+S' },
                description: 'Save/Unsave Track'
            },
            'seek-rewind': {
                description: 'Seek Track Backwards'
            },
            'block-track': {
                suggested_key: { default: 'Alt+Shift+B' },
                description: 'Add track to block list'
            },
            'show-track': {
                suggested_key: { default: 'Alt+Shift+T' },
                description: 'Show current track as a notification'
            },
            'toggle-new-releases': {
                description: 'Toggle New Releases UI'
            },
            'toggle-config': {
                description: 'Toggle Chorus Config UI'
            },
            'audio-preset-1': {
                description: 'Audio Preset 1'
            },
            'audio-preset-2': {
                description: 'Audio Preset 2'
            },
            'audio-preset-3': {
                description: 'Audio Preset 3'
            },
            'audio-preset-4': {
                description: 'Audio Preset 4'
            },
            'audio-preset-5': {
                description: 'Audio Preset 5'
            },
            'cycle-theme-next': {
                description: 'Cycle Theme Next'
            },
            'cycle-theme-previous': {
                description: 'Cycle Theme Previous'
            }
        }
    })
})
