<script lang="ts">
    import { get } from 'svelte/store'
    import { toast } from 'svelte-sonner'
    import { settingsStore } from '$lib/stores/settings'
    import { looksStore } from '$lib/stores/looks'
    import { closeLookEditor, lookEditing } from '$lib/stores/look-editor'
    import { applyLook } from '$lib/utils/theming'
    import type { Look } from '$lib/types/look'
    import LookEditor from './LookEditor.svelte'

    // The look editor as a drawer docked at the right of Spotify's main view,
    // over the live page: the sidebar, the bars, the page you were on and this
    // drawer's own surface all wear the draft as you change it, and Spotify
    // stays scrollable and playable beside it. The content script mounts this
    // while stores/look-editor holds a draft. Saving selects the saved look.

    function preview(look: Look | null) {
        void applyLook(get(settingsStore), get(looksStore), look)
    }

    async function save(look: Look) {
        const saved = await looksStore.saveLook(look)
        const settings = get(settingsStore)
        await settingsStore.updateSettings({
            theme: { ...settings.theme, look: saved.id },
            ui: { ...settings.ui, theme: true }
        })
        preview(null)
        toast.success(`“${saved.name}” saved.`)
        closeLookEditor()
    }

    function cancel() {
        preview(null)
        closeLookEditor()
    }
</script>

{#if $lookEditing}
    {#key $lookEditing.look.id}
        <div
            id="chorus-look-drawer-root"
            class="dark absolute inset-y-0 right-0 z-[9] flex w-[400px] max-w-full flex-col border-l border-hairline bg-ink text-ink-fg shadow-float"
            role="dialog"
            aria-modal="false"
            aria-label={$lookEditing.isNew ? 'New look' : `Edit ${$lookEditing.look.name}`}
        >
            <LookEditor
                look={$lookEditing.look}
                isNew={$lookEditing.isNew}
                onSave={save}
                onCancel={cancel}
                onPreview={preview}
            />
        </div>
    {/key}
{/if}
