<script lang="ts">
    import * as Avatar from '$lib/components/ui/avatar'
    let {
        src = chrome.runtime.getURL('/icon/32.png'),
        alt = 'chorus logo',
        class: className
    }: { src?: string | undefined; alt?: string | undefined; class?: string | undefined } = $props()
</script>

<Avatar.Root class="size-5 rounded-md {className}">
    <Avatar.Image {src} {alt} />
    <Avatar.Fallback class="bg-surface-2 text-[10px] text-ink-muted">ch</Avatar.Fallback>
</Avatar.Root>
