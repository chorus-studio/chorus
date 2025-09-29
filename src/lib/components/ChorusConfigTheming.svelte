<script lang="ts">
    import type { ThemeName } from '$lib/utils/theming'
    import { settingsStore } from '$lib/stores/settings'
    import { setTheme, THEME_NAMES, STATIC_THEMES } from '$lib/utils/theming'

    import { Button } from '$lib/components/ui/button'

    async function updateTheme(e: MouseEvent) {
        const theme = (e.currentTarget as HTMLDivElement).dataset.theme as ThemeName
        if (theme === $settingsStore.theme.name) return

        await settingsStore.updateSettings({
            theme: {
                ...$settingsStore.theme,
                name: theme
            }
        })

        await setTheme(theme)
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex w-full flex-col gap-2 rounded-md">
        <div class="flex w-full justify-between rounded-md bg-muted p-4">
            <h1>Theming</h1>
            <p>Customize the appearance of Chorus to your liking.</p>
        </div>
    </div>
    <div class="grid grid-cols-5 gap-4">
        {#each THEME_NAMES as theme}
            <div
                style={`background-color: ${STATIC_THEMES[theme as ThemeName]?.shadow ?? '#000'}`}
                class="relative aspect-square size-32 rounded-md"
            >
                <Button
                    variant="outline"
                    data-theme={theme}
                    onclick={updateTheme}
                    class="absolute z-10 aspect-square size-32 rounded-md bg-transparent hover:bg-transparent"
                ></Button>

                <span
                    class="absolute bottom-1.5 left-0 right-0 z-[5] text-center text-xs"
                    style={`color: ${STATIC_THEMES[theme as ThemeName]?.text ?? '#fff'}`}
                >
                    {theme.split('_').join(' ')}
                </span>

                <div
                    class="absolute inset-0 flex justify-center gap-1 rounded-md p-1 py-2"
                    style={`background-color: ${STATIC_THEMES[theme as ThemeName]?.shadow ?? '#000'}`}
                >
                    <div
                        style={`background-color: ${STATIC_THEMES[theme as ThemeName]?.sidebar ?? '#121212'}`}
                        class="left-0 h-24 w-2.5 rounded-sm"
                    ></div>

                    <div
                        style={`background-color: ${STATIC_THEMES[theme as ThemeName]?.sidebar ?? '#121212'}`}
                        class="left-1 top-2 h-24 w-24 rounded-sm"
                    ></div>
                </div>
            </div>
        {/each}
    </div>
</div>
