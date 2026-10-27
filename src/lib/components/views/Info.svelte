<script lang="ts">
    import { onMount } from 'svelte'
    import type { Component } from 'svelte'
    import Logo from '$lib/components/Logo.svelte'
    import Keycaps from '$lib/components/Keycaps.svelte'
    import { getVersion } from '$lib/utils/version'
    import { getCommandService } from '$lib/utils/command'

    import Bug from '@lucide/svelte/icons/bug'
    import Star from '@lucide/svelte/icons/star'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import MessageCircle from '@lucide/svelte/icons/message-circle'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    const version = getVersion()

    const links: Array<{ title: string; sub: string; href: string; icon: Component }> = [
        {
            title: 'Report a bug',
            sub: 'GitHub issues',
            href: 'https://github.com/chorus-studio/chorus-dev/issues',
            icon: Bug
        },
        {
            title: 'Ask for help',
            sub: 'Discord community',
            href: 'https://discord.gg/6nwYZsBw8G',
            icon: MessageCircle
        },
        {
            title: 'Rate Chorus',
            sub: 'Chrome Web Store',
            href: 'https://chromewebstore.google.com/detail/chorus-spotify-enhancer/jfnjmnapkhdbaidedlbdcmhiphfjljcd/reviews',
            icon: Star
        },
        {
            title: 'Rate Chorus',
            sub: 'Firefox Add-ons',
            href: 'https://addons.mozilla.org/en-CA/firefox/addon/chorus-spotify-enhancer/',
            icon: Star
        }
    ]

    // Live shortcut bindings for the three core commands (users can remap them).
    const CORE = [
        { name: 'on/off', label: 'on / off' },
        { name: 'save/unsave', label: 'save track' },
        { name: 'block-track', label: 'block track' }
    ]
    let shortcuts = $state<Record<string, string>>({})

    async function loadShortcuts() {
        try {
            const commands = (await getCommandService().getCommands()) as chrome.commands.Command[]
            shortcuts = Object.fromEntries(commands.map((c) => [c.name ?? '', c.shortcut || '']))
        } catch {
            shortcuts = {}
        }
    }

    function getBrowser() {
        const ua = navigator.userAgent
        if (ua.includes('Edg')) return 'edge'
        if (ua.includes('Firefox')) return 'firefox'
        return 'chrome'
    }

    async function openShortcutSettings() {
        const browser = getBrowser()
        const url = browser == 'firefox' ? 'about:addons' : `${browser}://extensions/shortcuts`
        await getCommandService().openShortcutSettings(url)
    }

    onMount(loadShortcuts)
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <div class="flex items-center gap-x-2.5">
        <Logo size={26} />
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[15px] font-bold leading-none tracking-tight text-ink-fg">Chorus</span
            >
            <span class="text-[11px] text-ink-muted">v{version} · free, open source, MIT</span>
        </div>
    </div>

    <div class="grid grid-cols-2 gap-1.5">
        {#each links as link (link.href)}
            <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                class="chorus-focus flex h-[34px] items-center gap-x-2.5 rounded-lg border border-hairline bg-panel px-2.5 text-ink-fg no-underline transition-colors hover:border-hairline-strong hover:bg-surface"
            >
                <span
                    class="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg-2"
                >
                    <link.icon class="size-3.5" />
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-y-0.5 leading-none">
                    <span class="truncate text-xs">{link.title}</span>
                    <span class="truncate text-[10px] text-ink-muted">{link.sub}</span>
                </span>
                <ExternalLink class="size-3 shrink-0 text-ink-dim" />
            </a>
        {/each}
    </div>

    <div class="mt-auto flex items-end justify-between gap-x-3">
        <div class="flex flex-col gap-y-1.5">
            <span class="rack-label">Shortcuts</span>
            <div class="flex flex-wrap gap-x-3.5 gap-y-1">
                {#each CORE as cmd (cmd.name)}
                    {@const combo = shortcuts[cmd.name]}
                    <span class="flex items-center gap-x-1 text-[11px] text-ink-muted">
                        {#if combo}
                            <Keycaps {combo} />
                        {:else}
                            <span class="font-mono text-[10px] text-amber">not set</span>
                        {/if}
                        <span class="ml-0.5">{cmd.label}</span>
                    </span>
                {/each}
            </div>
        </div>
        <button
            type="button"
            onclick={openShortcutSettings}
            class="chorus-focus inline-flex shrink-0 items-center gap-x-1 rounded-md px-1 text-xs text-signal hover:text-signal-bright"
        >
            Change shortcuts
            <ExternalLink class="size-3" />
        </button>
    </div>
</div>
