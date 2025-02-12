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
        web_accessible_resources: [
            {
                resources: [
                    '/init.js',
                    '/media-capture.js',
                    '/media-override.js',
                    '/media-listener.js'
                ],
                matches: ['<all_urls>']
            }
        ]
    }
})
