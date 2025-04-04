<script lang="ts">
    import { Toaster } from '$lib/components/ui/sonner'
</script>

<Toaster
    richColors
    closeButton
    theme="light"
    position="bottom-right"
    customClasses={{
        toast: 'p-4 flex items-center gap-x-2 w-full rounded-md',
        error: '!bg-red-200',
        success: '!bg-green-200',
        warning: '!bg-yellow-200',
        info: '!bg-blue-200'
    }}
/>
