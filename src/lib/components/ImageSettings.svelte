<script lang="ts">
  import ResolutionPicker from './ResolutionPicker.svelte';
  import type { Resolution } from '$lib/presets';

  let {
    size = $bindable(),
    samples = $bindable(),
    limit,
  }: { size: Resolution; samples: number; limit: (size: Resolution) => number } = $props();

  const max = $derived(limit(size));

  function setSize(next: Resolution | null) {
    if (!next) return;
    size = next;
    samples = Math.min(samples, limit(next));
  }
</script>

<div class="flex flex-col gap-2">
  <ResolutionPicker bind:size={() => size, setSize} />

  <span class="text-sm font-semibold">Number of images</span>
  <div class="join w-full">
    {#each Array.from({ length: max }, (_, i) => i + 1) as n (n)}
      <button class="btn btn-sm join-item flex-1" class:btn-primary={samples === n} onclick={() => (samples = n)}>{n}</button>
    {/each}
  </div>
</div>
