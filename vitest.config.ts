import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: { $lib: new URL('./src/lib', import.meta.url).pathname }
    },
    test: {
        include: ['src/**/*.test.ts'],
        setupFiles: ['src/test/setup.ts']
    }
})
