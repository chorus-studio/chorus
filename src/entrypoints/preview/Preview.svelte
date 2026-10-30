<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import TabsList from '$lib/components/TabsList.svelte'
    import PopUp from '$lib/components/views/PopUp.svelte'
    import PowerOffOverlay from '$lib/components/PowerOffOverlay.svelte'
    import VocalRemovalToggle from '$lib/components/VocalRemovalToggle.svelte'
    import PopupSubview from '$lib/components/PopupSubview.svelte'
    import ChorusConfigDialog from '$lib/components/ChorusConfigDialog.svelte'
    import BlockedTracksDialog from '$lib/components/BlockedTracksDialog.svelte'
    import SnipsDialog from '$lib/components/SnipsDialog.svelte'
    import { storage } from '@wxt-dev/storage'
    import { dataStore } from '$lib/stores/data'
    import TimeProgress from '$lib/components/TimeProgress.svelte'
    import VolumeSlider from '$lib/components/VolumeSlider.svelte'
    import LoopButton from '$lib/components/LoopButton.svelte'
    import SeekButton from '$lib/components/SeekButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SkipButton from '$lib/components/SkipButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'
    import { applyPalette, derivePopupPalette } from '$lib/utils/vibrant-colors'
    import {
        STATIC_THEMES,
        SPOTIFY_PALETTE,
        applyThemeVariables,
        applyGlass,
        applyThemePopupPalette,
        type ThemeName,
        type Mode
    } from '$lib/utils/theming'
    import { invertPalette } from '$lib/utils/theme-surfaces'
    import { DEFAULT_GLASS, settingsStore } from '$lib/stores/settings'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { sleepStore } from '$lib/stores/sleep'
    import { configStore, createAudioPreset } from '$lib/stores/config'
    import { NORMAL_VALUES, QUICK_PRESETS, quickPresetById } from '$lib/audio-effects/quick-presets'
    import { applyPresetValues } from '$lib/utils/quick-presets'
    import { lofiStore, type LofiEffectKey } from '$lib/stores/lofi'
    import { effectsStore } from '$lib/stores/effects'
    import { eqSubView, fxSubView, msSubView, presetsSubView } from '$lib/stores/effects-ui'

    const params = new URLSearchParams(location.search)
    const scene = params.get('scene') ?? 'tabs'
    const tab = params.get('tab') ?? 'snip'
    const dialog = params.get('dialog') ?? ''
    // ?theme=hot_pink tints the rack and paints the page in that theme's chrome;
    // ?mode=light shows the light version of it (of Spotify's own palette when none).
    const mode: Mode = params.get('mode') === 'light' ? 'light' : 'dark'
    const staticTheme = STATIC_THEMES[(params.get('theme') ?? 'spotify') as ThemeName]
    const themeConfig =
        mode === 'light' ? invertPalette(staticTheme ?? SPOTIFY_PALETTE) : staticTheme
    const chrome = themeConfig?.player ?? '#000000'
    // ?glass=1 switches the glass surfaces on and paints a busy backdrop (album-like
    // colour fields and text) behind the frame so the blur has something to show.
    // ?popup=theme makes the popup wear the theme instead of the album palette.
    const glass = params.get('glass') === '1'
    const popupColours = params.get('popup') === 'theme' ? 'theme' : 'album'
    const backdrop = glass
        ? `radial-gradient(circle at 18% 28%, #ff6b6b 0, transparent 34%), radial-gradient(circle at 72% 58%, #4d96ff 0, transparent 38%), radial-gradient(circle at 48% 92%, #ffd93d 0, transparent 30%), radial-gradient(circle at 88% 12%, #6bcb77 0, transparent 26%), ${chrome}`
        : chrome

    onMount(async () => {
        document.documentElement.classList.add('dark')
        document.documentElement.setAttribute('data-mode', mode)
        // A teal cover, in the scene's appearance, stands in for album art.
        const teal = derivePopupPalette([{ hex: '#1b6b63', population: 1 }], mode)
        if (teal) applyPalette(document.documentElement, teal)
        if (themeConfig) applyThemeVariables(themeConfig, mode)
        if (popupColours === 'theme') applyThemePopupPalette(document.documentElement)
        // Components read glass and the popup colour source from the settings
        // store; the preview shim's storage never fires change events, so seed
        // the store directly (it writes storage too).
        const current = get(settingsStore)
        // ?granted=1&on=1 seeds the header's notification control (Allow / off / on).
        const notificationsOn = params.get('on') === '1'
        await settingsStore.updateSettings({
            ui: { ...current.ui, glass },
            theme: {
                ...current.theme,
                appearance: mode,
                popup: popupColours,
                glass: DEFAULT_GLASS
            },
            notifications: {
                granted: params.get('granted') === '1',
                enabled: notificationsOn,
                on_track_change: notificationsOn
            }
        })
        applyGlass(get(settingsStore))
        // ?volume=120 gives the playing track a saved volume offset.
        const volume = Number(params.get('volume'))
        if (volume > 0) await nowPlaying.updateState({ volume })
        // ?sleep=23 sets a sleep timer 23 minutes out; ?sleep=track, at the track's end.
        const sleep = params.get('sleep')
        if (sleep === 'track') await sleepStore.start('track')
        else if (sleep && Number(sleep) > 0)
            await sleepStore.start(15, Date.now() + (Number(sleep) - 15) * 60_000)
    })

    // ?dialog=blocked&view=grid seeds a few blocked tracks (solid-colour covers) and
    // the view preference before the dialog mounts, so both views can be shot.
    const DAY = 24 * 60 * 60 * 1000
    const swatch = (hex: string) =>
        `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='${hex.replace('#', '%23')}'/></svg>`
    const SAMPLE_BLOCKED = [
        ['Easier Said Than Done by Thee Sacred Souls', '#6b5a3e', 2 * DAY],
        ['Red Room by Hiatus Kaiyote', '#2b2b2b', 5 * DAY],
        ['rwm by the booyah! kids', '#8fb36b', 3 * 60 * 60 * 1000],
        ['Can I Call You Rose? by Thee Sacred Souls', '#7a4a52', 12 * DAY],
        ['Nakamarra by Hiatus Kaiyote', '#3f5b73', 40 * DAY],
        ['Lady Love by Thee Sacred Souls', '#5c4a6b', 0],
        ['Get Sun by Hiatus Kaiyote', '#b3833a', 90 * DAY]
    ] as const
    let ready = $state(
        !['blocked', 'backup', 'snips'].includes(dialog) &&
            !['presets', 'fx', 'eq', 'ms'].includes(tab)
    )

    // ?tab=fx&reverb=hall, ?tab=eq&eq=Rock and ?tab=ms&ms=wide seed the effect
    // tabs with that preset on; &view=config opens the Config half instead of
    // Presets.
    onMount(async () => {
        if (tab !== 'fx' && tab !== 'eq' && tab !== 'ms') return
        await new Promise((resolve) => setTimeout(resolve, 20))
        const reverb = params.get('reverb')
        const eq = params.get('eq')
        const ms = params.get('ms')
        if (reverb) await effectsStore.updateEffect({ key: 'reverb', value: reverb })
        if (eq) await effectsStore.updateEffect({ key: 'equalizer', value: eq })
        if (ms) await effectsStore.updateEffect({ key: 'msProcessor', value: ms })
        if (params.get('view') === 'config') {
            const subView = tab === 'fx' ? fxSubView : tab === 'eq' ? eqSubView : msSubView
            subView.set('config')
        }
        ready = true
    })

    // ?tab=presets&preset=nightcore&group=mine&mine=1 seeds the Presets tab: the
    // named built-in applied (so its card is lit), the group to open on, and two
    // saved slots for Mine. The frame mounts once the stores hold all of it.
    // &view=rack opens the texture rack instead of the cards, and
    // &tweak=lowPass:50 nudges one knob so the status reads "tweaked from";
    // &origin=mine (with mine=1) starts from the first saved slot instead.
    onMount(async () => {
        if (tab !== 'presets') return
        // The stores hydrate from (shim) storage in microtasks after import; a
        // macrotask later they are settled, so the seed below is not overwritten.
        await new Promise((resolve) => setTimeout(resolve, 20))
        const group = params.get('group')
        if (group) await storage.setItem('local:chorus_preset_group', group)
        if (params.get('mine') === '1') {
            const lofi = QUICK_PRESETS.find((p) => p.id === 'classic-lofi') ?? QUICK_PRESETS[0]
            await configStore.updateConfig({
                audio_presets: [
                    createAudioPreset(lofi, 'Late night'),
                    createAudioPreset(
                        {
                            playback: {
                                rate: { value: 1.2, preserves_pitch: true },
                                pitch: 1,
                                semitone: -2
                            },
                            effect: {
                                equalizer: 'Bass booster',
                                reverb: 'none',
                                msProcessor: 'none'
                            },
                            lofi: NORMAL_VALUES.lofi
                        },
                        'Gym'
                    )
                ]
            })
        }
        const preset = quickPresetById(params.get('preset') ?? '')
        if (preset) await applyPresetValues(preset, preset.id)
        const slot = get(configStore).audio_presets[0]
        if (params.get('origin') === 'mine' && slot) await applyPresetValues(slot, slot.id)
        const [knob, amount] = (params.get('tweak') ?? '').split(':')
        if (knob && amount) {
            await lofiStore.update(knob as LofiEffectKey, { intensity: Number(amount) })
        }
        if (params.get('view') === 'rack') presetsSubView.set('rack')
        ready = true
    })

    // ?open=reverb-bottom clicks that select's trigger once the tab is up, so a
    // shot can show its list; ?css=… adds a stylesheet, for trying a layout
    // before building it.
    onMount(() => {
        const css = params.get('css')
        if (css)
            document.head.appendChild(
                Object.assign(document.createElement('style'), { textContent: css })
            )
        const open = params.get('open')
        if (!open) return
        const tick = setInterval(() => {
            const trigger = document.getElementById(open)
            if (!trigger) return
            clearInterval(tick)
            trigger.click()
        }, 50)
        return () => clearInterval(tick)
    })

    // ?dialog=backup seeds the same blocked tracks plus two snips, saved presets
    // and a Mine slot so the Backup tab's counts read; &backup=done adds a
    // backup made three days ago.
    onMount(async () => {
        if (dialog !== 'blocked' && dialog !== 'backup') return
        const view = params.get('view')
        if (view === 'grid' || view === 'list')
            await storage.setItem('local:chorus_blocked_view', view)
        for (const [song_id, hex, age] of SAMPLE_BLOCKED) {
            const track_id = song_id.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            await dataStore.updateTrack({
                track_id,
                value: {
                    track_id,
                    song_id,
                    cover: swatch(hex),
                    blocked: true,
                    blocked_at: age ? Date.now() - age : null
                }
            })
        }
        if (dialog === 'backup') {
            const snip = { mode: 'play' as const, ranges: [{ start: 42, end: 71 }] }
            for (const track_id of ['nakamarra-by-hiatus-kaiyote', 'molasses-by-hiatus-kaiyote']) {
                await dataStore.updateTrack({
                    track_id,
                    value: { track_id, song_id: track_id, snip, blocked: null }
                })
            }
            await storage.setItem('local:chorus_user_eq_presets', { Warm: [], Bright: [] })
            await storage.setItem('local:chorus_user_reverb_presets', { Attic: {} })
            const lofi = QUICK_PRESETS.find((p) => p.id === 'classic-lofi') ?? QUICK_PRESETS[0]
            await configStore.updateConfig({
                audio_presets: [createAudioPreset(lofi, 'Late night')]
            })
            if (params.get('backup') === 'done')
                await storage.setItem('local:chorus_backup_at', Date.now() - 3 * DAY)
        }
        ready = true
    })

    // ?dialog=snips seeds six snipped tracks (both modes, one to four sections,
    // mixed ages, one without a cover); &empty=1 leaves the list bare.
    const SAMPLE_SNIPS: Array<[string, string | null, number, 'play' | 'skip', number[][]]> = [
        ['Red Room by Hiatus Kaiyote', '#2b2b2b', 2 * 60 * 60 * 1000, 'play', [[42, 71]]],
        ['Caliphate (feat. Vince Staples) by Earl Sweatshirt', '#5a3d2b', DAY, 'skip', [[0, 18]]],
        [
            'Weightless by Marconi Union',
            '#3f5b73',
            4 * DAY,
            'play',
            [
                [95, 140],
                [210, 262]
            ]
        ],
        [
            'Molasses by Hiatus Kaiyote',
            '#b3833a',
            9 * DAY,
            'play',
            [
                [30, 62],
                [118, 150],
                [201, 240],
                [300, 330]
            ]
        ],
        [
            'rwm by the booyah! kids',
            null,
            30 * DAY,
            'skip',
            [
                [0, 12],
                [150, 171]
            ]
        ],
        ['Get Sun by Hiatus Kaiyote', '#8fb36b', 0, 'play', [[64, 125]]]
    ]
    onMount(async () => {
        if (dialog !== 'snips') return
        if (params.get('empty') !== '1') {
            for (const [song_id, hex, age, mode, ranges] of SAMPLE_SNIPS) {
                const track_id = song_id.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                await dataStore.updateTrack({
                    track_id,
                    value: {
                        track_id,
                        song_id,
                        cover: hex ? swatch(hex) : null,
                        snip: { mode, ranges: ranges.map(([start, end]) => ({ start, end })) },
                        snipped_at: age ? Date.now() - age : null
                    }
                })
            }
        }
        ready = true
    })
</script>

<div class="dark relative min-h-screen p-6 text-ink-fg" style="background: {backdrop}">
    {#if glass}
        <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 select-none overflow-hidden p-6 font-semibold leading-[1.1] text-white/70"
            style="font-size: 44px"
        >
            Caliphate (feat. Vince Staples) · Earl Sweatshirt · Red Room · Hiatus Kaiyote · Easier
            Said Than Done · Thee Sacred Souls · Nakamarra · Get Sun · Lady Love · Will I See You
            Again? · Molasses · Weightless · rwm · the booyah! kids
        </div>
    {/if}
    {#if scene === 'tabs'}
        <div
            id="frame"
            class="chorus-float relative h-[360px] w-[440px] overflow-hidden rounded-xl border border-hairline-strong bg-ink shadow-float"
        >
            {#if ready}<TabsList initialTab={tab} />{/if}
        </div>
    {:else if scene === 'pip'}
        <div
            id="frame"
            class="h-[360px] w-[440px] overflow-hidden rounded-lg border border-hairline-strong bg-ink"
        >
            {#if ready}<TabsList pip initialTab={tab} />{/if}
        </div>
    {:else if scene === 'popup'}
        <div id="frame" class="w-[320px] overflow-hidden rounded-lg border border-hairline-strong">
            <PopUp onVoice={() => {}} />
        </div>
    {:else if scene === 'popup-off'}
        <div id="frame" class="w-[320px] overflow-hidden rounded-lg border border-hairline-strong">
            <PowerOffOverlay onenable={() => {}} />
        </div>
    {:else if scene === 'popup-voice'}
        <div id="frame" class="w-[320px] overflow-hidden rounded-lg border border-hairline-strong">
            <PopupSubview label="Chrome only · on-device" onback={() => {}}>
                <VocalRemovalToggle />
            </PopupSubview>
        </div>
    {:else if scene === 'bar'}
        <div
            id="frame"
            class="flex h-[96px] w-[1280px] items-center gap-x-6 px-4"
            style="background: {chrome}; color: {themeConfig?.text ?? '#ffffff'}"
        >
            <div class="flex items-center gap-x-3">
                <div class="size-14 rounded bg-surface-2"></div>
                <div class="flex flex-col gap-y-1">
                    <span class="text-sm font-medium">Midnight City</span><span
                        class="text-[11px] text-ink-muted">M83</span
                    >
                </div>
                <div id="chorus-ui" class="dark flex items-center gap-x-0.5">
                    <HeartButton />
                    <SettingsPopover />
                    <SkipButton />
                </div>
            </div>
            <div class="flex max-w-[620px] flex-1 flex-col items-center gap-y-1.5">
                <div class="flex items-center gap-x-1.5">
                    <SeekButton role="seek-backward" />
                    <div class="size-8 rounded-full bg-white"></div>
                    <SeekButton role="seek-forward" />
                    <LoopButton />
                </div>
                <div class="w-full"><TimeProgress id="chorus-time-progress" port={null} /></div>
            </div>
            <div class="flex w-[300px] justify-end"><VolumeSlider port={null} /></div>
        </div>
    {:else if scene === 'dialog'}
        <div id="frame" class="flex items-center gap-x-4 rounded-lg bg-ink p-4">
            {#if dialog === 'blocked'}
                {#if ready}<BlockedTracksDialog open />{/if}
            {:else if dialog === 'backup'}
                {#if ready}<ChorusConfigDialog open initialTab="backup" />{/if}
            {:else if dialog === 'snips'}
                {#if ready}<SnipsDialog open />{/if}
            {:else}
                <ChorusConfigDialog open initialTab={dialog || 'auto-skip'} />
            {/if}
        </div>
    {/if}
</div>
