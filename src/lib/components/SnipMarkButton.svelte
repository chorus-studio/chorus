<script lang="ts">
    import { onMount } from 'svelte'
    import { markSnip, watchMarks } from '$lib/utils/snip-mark'

    onMount(watchMarks)
</script>

<!-- The target of the `snip-mark` keyboard command (utils/selectors.ts): the
     background clicks it and the page does the work. Never shown. -->
<button
    id="chorus-snip-mark"
    type="button"
    class="hidden"
    tabindex="-1"
    aria-hidden="true"
    onclick={() => void markSnip()}
></button>
