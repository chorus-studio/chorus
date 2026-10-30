<script lang="ts">
    import { onMount } from 'svelte'
    import { storage } from '@wxt-dev/storage'
    import { toast } from 'svelte-sonner'
    import Download from '@lucide/svelte/icons/download'
    import Upload from '@lucide/svelte/icons/upload'
    import FileJson from '@lucide/svelte/icons/file-json'
    import { Button } from '$lib/components/ui/button'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { dataStore } from '$lib/stores/data'
    import { COLLECTION_KEY } from '$lib/stores/data/cache'
    import { timeAgo } from '$lib/utils/time-ago'
    import {
        LAST_BACKUP_KEY,
        BackupError,
        applyBackup,
        backupFileName,
        createBackup,
        describeSummary,
        parseBackup,
        serializeBackup,
        summarizeBackup,
        type Backup,
        type BackupSummary,
        type RestoreMode
    } from '$lib/utils/backup'

    const EMPTY: BackupSummary = {
        snips: 0,
        blocked: 0,
        speeds: 0,
        eq_presets: 0,
        reverb_presets: 0,
        mine_presets: 0,
        settings: false
    }

    let summary = $state<BackupSummary>(EMPTY)
    let lastBackup = $state<number | null>(null)
    let mode = $state<RestoreMode>('add')
    let pending = $state<{ name: string; backup: Backup; summary: BackupSummary } | null>(null)
    let error = $state<string | null>(null)
    let busy = $state(false)
    let fileInput = $state<HTMLInputElement | null>(null)

    function extensionVersion(): string {
        try {
            return chrome.runtime.getManifest().version
        } catch {
            return 'dev'
        }
    }

    async function refresh() {
        const backup = await createBackup(extensionVersion())
        summary = summarizeBackup(backup.data)
        lastBackup = (await storage.getItem<number>(LAST_BACKUP_KEY)) ?? null
    }

    onMount(() => {
        refresh()
        // Blocking a track or saving a preset while the dialog is open should move the counts.
        const unwatch = [
            'local:chorus_collection',
            'local:chorus_user_eq_presets',
            'local:chorus_user_reverb_presets',
            'local:chorus_config'
        ].map((key) => storage.watch(key as `local:${string}`, refresh))
        return () => unwatch.forEach((stop) => stop())
    })

    /** Hand the browser a link to save; a content script has no downloads API. */
    function saveFile(name: string, text: string) {
        const link = document.createElement('a')
        link.href = `data:application/json;charset=utf-8,${encodeURIComponent(text)}`
        link.download = name
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    async function exportBackup() {
        busy = true
        try {
            const backup = await createBackup(extensionVersion())
            saveFile(backupFileName(backup), serializeBackup(backup))
            lastBackup = Date.now()
            await storage.setItem(LAST_BACKUP_KEY, lastBackup)
            toast.success('Backup saved to your downloads')
        } catch (err) {
            console.error('Backup export failed:', err)
            toast.error('Could not save the backup')
        } finally {
            busy = false
        }
    }

    async function onFileChosen(event: Event) {
        const input = event.currentTarget as HTMLInputElement
        const file = input.files?.[0]
        // Clear the input so the same file can be chosen again after a cancel.
        input.value = ''
        if (!file) return
        error = null
        try {
            const backup = parseBackup(await file.text())
            pending = { name: file.name, backup, summary: summarizeBackup(backup.data) }
        } catch (err) {
            pending = null
            error = err instanceof BackupError ? err.message : 'Could not read that file.'
        }
    }

    async function restore() {
        if (!pending) return
        busy = true
        try {
            const restored = await applyBackup(pending.backup, mode)
            // The in-page library cache lives in session storage and is not
            // watched: rebuild it from what was just written.
            dataStore.delete(COLLECTION_KEY)
            await dataStore.populate()
            toast.success(`${mode === 'add' ? 'Added' : 'Restored'} ${describeSummary(restored)}`)
            pending = null
            await refresh()
        } catch (err) {
            console.error('Backup restore failed:', err)
            toast.error('Could not restore that backup')
        } finally {
            busy = false
        }
    }

    const stats = $derived([
        { label: 'Snips', value: summary.snips },
        { label: 'Blocked', value: summary.blocked },
        { label: 'Track speeds', value: summary.speeds },
        { label: 'EQ presets', value: summary.eq_presets },
        { label: 'Reverb presets', value: summary.reverb_presets },
        { label: 'Mine presets', value: summary.mine_presets }
    ])

    const MODE_HINT: Record<RestoreMode, string> = {
        add: 'Adds the file’s snips, blocked tracks, track speeds and saved presets to yours. Your settings stay as they are.',
        replace:
            'Everything in the file takes the place of what you have now, settings and theme included.'
    }

    const madeOn = (iso: string) =>
        iso
            ? new Date(iso).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
              })
            : 'an unknown date'
</script>

<div class="flex flex-col gap-y-3">
    <div class="flex flex-col gap-y-0.5">
        <span class="text-[13px] font-medium text-ink-fg">Keep a copy of your library</span>
        <span class="text-xs text-ink-muted">
            Snips, blocked tracks, track speeds, saved presets and every setting, as one JSON file
            on your computer. Restore it here, in another browser, or after a reinstall.
        </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
        <section
            class="flex flex-col gap-y-3 rounded-md border border-hairline bg-panel p-3"
            aria-labelledby="chorus-backup-export"
        >
            <div class="flex h-[18px] items-center justify-between">
                <span id="chorus-backup-export" class="rack-label">Export</span>
                <span class="font-mono text-[11px] text-ink-muted">
                    {lastBackup ? `Last backup ${timeAgo(lastBackup)}` : 'No backup yet'}
                </span>
            </div>
            <dl class="grid grid-cols-3 gap-2">
                {#each stats as stat (stat.label)}
                    <div
                        class="flex flex-col gap-y-1 rounded-md border border-hairline bg-inset px-2.5 py-2"
                    >
                        <dd
                            class="font-mono text-lg tabular-nums leading-none {stat.value
                                ? 'text-ink-fg'
                                : 'text-ink-muted'}"
                        >
                            {stat.value}
                        </dd>
                        <dt class="text-[11px] leading-none text-ink-muted">{stat.label}</dt>
                    </div>
                {/each}
            </dl>
            <div class="mt-auto flex items-center justify-between gap-x-3">
                <span class="text-[11px] text-ink-muted">
                    Settings, theme and auto-skip rules go in too.
                </span>
                <Button size="sm" onclick={exportBackup} disabled={busy}>
                    <Download /> Export backup
                </Button>
            </div>
        </section>

        <section
            class="flex flex-col gap-y-3 rounded-md border border-hairline bg-panel p-3"
            aria-labelledby="chorus-backup-restore"
        >
            <div class="flex h-[18px] items-center">
                <span id="chorus-backup-restore" class="rack-label">Restore</span>
            </div>
            <SegmentedControl
                grow
                size="sm"
                ariaLabel="How to restore"
                value={mode}
                onValueChange={(value) => (mode = value as RestoreMode)}
                options={[
                    { label: 'Add to my library', value: 'add' },
                    { label: 'Replace everything', value: 'replace' }
                ]}
            />
            <span class="text-xs text-ink-muted">{MODE_HINT[mode]}</span>

            {#if pending}
                <div
                    class="flex items-start gap-x-2.5 rounded-md border border-hairline bg-inset px-3 py-2.5"
                >
                    <FileJson class="mt-0.5 size-4 shrink-0 text-ink-fg-2" />
                    <div class="flex min-w-0 flex-col gap-y-0.5 text-xs">
                        <span class="truncate font-medium text-ink-fg">{pending.name}</span>
                        <span class="text-ink-muted">
                            Made {madeOn(pending.backup.exported_at)} with Chorus {pending.backup
                                .version}
                        </span>
                        <span class="text-ink-fg-2">{describeSummary(pending.summary)}</span>
                    </div>
                </div>
                <div class="mt-auto flex items-center justify-end gap-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => (pending = null)}
                        disabled={busy}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={mode === 'replace' ? 'destructive' : 'default'}
                        size="sm"
                        onclick={restore}
                        disabled={busy}
                    >
                        {mode === 'add' ? 'Add to library' : 'Replace everything'}
                    </Button>
                </div>
            {:else}
                {#if error}
                    <span class="text-xs text-alarm" role="alert">{error}</span>
                {/if}
                <div class="mt-auto flex items-center justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onclick={() => fileInput?.click()}
                        disabled={busy}
                    >
                        <Upload /> Choose backup file
                    </Button>
                </div>
            {/if}
            <input
                bind:this={fileInput}
                type="file"
                accept=".json,application/json"
                class="hidden"
                tabindex="-1"
                aria-hidden="true"
                onchange={onFileChosen}
            />
        </section>
    </div>
</div>
