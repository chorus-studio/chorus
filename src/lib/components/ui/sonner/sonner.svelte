<script lang="ts">
    import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner'

    let {
        theme = 'dark',
        customClasses,
        ...restProps
    }: SonnerProps & { customClasses?: Record<string, string> } = $props()
</script>

<Sonner
    {theme}
    class="toaster group"
    toastOptions={{
        classes: {
            toast: 'group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-hairline-strong group-[.toaster]:bg-surface group-[.toaster]:text-ink-fg group-[.toaster]:shadow-float',
            title: 'group-[.toast]:text-[13px] group-[.toast]:font-medium',
            description: 'group-[.toast]:text-xs group-[.toast]:text-ink-muted',
            actionButton: 'group-[.toast]:bg-signal group-[.toast]:text-signal-fg',
            cancelButton: 'group-[.toast]:bg-surface-2 group-[.toast]:text-ink-fg-2',
            closeButton:
                'group-[.toast]:border-hairline-strong group-[.toast]:bg-surface-2 group-[.toast]:text-ink-fg-2',
            success: 'group-[.toaster]:[&_svg]:text-signal',
            error: 'group-[.toaster]:[&_svg]:text-alarm',
            warning: 'group-[.toaster]:[&_svg]:text-amber',
            info: 'group-[.toaster]:[&_svg]:text-ink-fg-2',
            ...customClasses
        }
    }}
    {...restProps}
/>
