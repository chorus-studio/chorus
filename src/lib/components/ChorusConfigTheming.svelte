<script lang="ts">
    import type { ThemeName } from '$lib/utils/theming'
    import { settingsStore } from '$lib/stores/settings'
    import { setTheme, removeTheme, THEME_NAMES, STATIC_THEMES } from '$lib/utils/theming'

    import Check from '@lucide/svelte/icons/check'
    import { Switch } from '$lib/components/ui/switch'
    import { cn } from '$lib/utils.js'

    async function updateTheme(theme: ThemeName) {
        if (theme === $settingsStore.theme.name) return

        // Picking a palette applies it, and the "Apply theme" switch follows.
        await settingsStore.updateSettings({
            theme: { ...$settingsStore.theme, name: theme },
            ui: { ...$settingsStore.ui, theme: theme !== 'spotify' }
        })

        await setTheme(theme)
    }

    async function toggleApply(enabled: boolean) {
        await settingsStore.updateSettings({ ui: { ...$settingsStore.ui, theme: enabled } })
        if (!enabled) return removeTheme()
        await setTheme($settingsStore.theme.name)
    }

    const SPOTIFY_PREVIEW = {
        main: '#121212',
        sidebar: '#121212',
        shadow: '#000000',
        text: '#ffffff',
        subtext: '#b3b3b3',
        button: '#1ed760'
    }

    function preview(theme: ThemeName) {
        return STATIC_THEMES[theme] ?? SPOTIFY_PREVIEW
    }

    const label = (theme: string) =>
        theme === 'spotify'
            ? 'Spotify (default)'
            : theme === 'artic'
              ? 'Arctic'
              : theme
                    .split('_')
                    .join(' ')
                    .replace(/^\w/, (c) => c.toUpperCase())
</script>

<div class="flex flex-col gap-y-3.5">
    <div class="flex items-center justify-between gap-x-4">
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[13px] font-medium text-ink-fg">Recolour the Spotify web player</span>
            <span class="text-xs text-ink-muted">
                Pick a palette for the sidebar, main view and player bar. Chorus's own panels take
                on the same tint; green stays the signal colour.
            </span>
        </div>
        <label class="flex shrink-0 items-center gap-x-2 text-xs text-ink-fg-2">
            Apply theme
            <Switch
                checked={$settingsStore.ui.theme}
                onCheckedChange={toggleApply}
                aria-label="Apply theme"
            />
        </label>
    </div>

    <div class="grid grid-cols-5 gap-3" role="radiogroup" aria-label="Theme">
        {#each THEME_NAMES as theme (theme)}
            {@const p = preview(theme)}
            {@const selected = $settingsStore.theme.name === theme}
            <button
                type="button"
                role="radio"
                aria-checked={selected}
                data-theme={theme}
                onclick={() => updateTheme(theme)}
                class="group flex flex-col gap-y-1.5 text-left focus-visible:outline-none"
            >
                <span
                    class={cn(
                        'relative block h-[84px] w-full overflow-hidden rounded-lg border border-hairline transition-shadow group-hover:border-hairline-strong group-focus-visible:ring-2 group-focus-visible:ring-signal/60',
                        selected && 'ring-2 ring-signal'
                    )}
                    style="background: {p.shadow}"
                >
                    <span
                        class="absolute bottom-[18px] left-1.5 top-1.5 w-[22px] rounded"
                        style="background: {p.sidebar}"
                    ></span>
                    <span
                        class="absolute bottom-[18px] left-8 right-1.5 top-1.5 rounded"
                        style="background: {p.main}"
                    ></span>
                    <span
                        class="absolute left-[38px] top-3 h-[3px] w-[34px] rounded-sm"
                        style="background: {p.text}"
                    ></span>
                    <span
                        class="absolute left-[38px] top-[19px] h-[3px] w-[22px] rounded-sm opacity-60"
                        style="background: {p.subtext}"
                    ></span>
                    <span
                        class="absolute bottom-1.5 left-1.5 right-1.5 h-2 rounded-sm"
                        style="background: {p.sidebar}"
                    ></span>
                    <span
                        class="absolute bottom-5 right-3 size-2.5 rounded-full"
                        style="background: {p.button}"
                    ></span>
                    {#if selected}
                        <span
                            class="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-signal text-ink"
                        >
                            <Check class="size-2.5" strokeWidth={3} />
                        </span>
                    {/if}
                </span>
                <span class={cn('text-xs', selected ? 'text-ink-fg' : 'text-ink-fg-2')}
                    >{label(theme)}</span
                >
            </button>
        {/each}
    </div>
</div>
