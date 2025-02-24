<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import TimeSlider from '$lib/components/TimeSlider.svelte'
    import SnipInputs from '$lib/components/SnipInputs.svelte'
</script>

{#if $snipStore}
    <div class="flex w-full flex-col gap-x-1 gap-y-3">
        <TimeSlider />
        <SnipInputs />
    </div>
{/if}
