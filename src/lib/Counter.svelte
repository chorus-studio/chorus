<script lang="ts">
  import { Button } from './components/ui/button'
  let count: number = 0
  const increment = () => {
    count += 1
  }
</script>

<Button on:click={increment} variant="ghost" class="bg-green-400 w-8 h-8">
  count is {count}
</Button>
