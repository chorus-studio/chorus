<script lang="ts">
    import * as Avatar from '$lib/components/ui/avatar'
    let {
        src = chrome.runtime.getURL('/icon/32.png'),
        alt = 'chorus logo',
        class: className
    }: { src?: string | undefined; alt?: string | undefined; class?: string | undefined } = $props()
</script>

<Avatar.Root class="size-5 {className}">
    <Avatar.Image {src} {alt} />
    <Avatar.Fallback>chorus</Avatar.Fallback>
</Avatar.Root>
