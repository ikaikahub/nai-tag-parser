<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, action, children }: { title: string; action?: Snippet; children: Snippet } = $props();
</script>

<div class="flex items-center justify-between px-4 pt-6 pb-1">
  <h2 class="text-base font-semibold">{title}</h2>
  {@render action?.()}
</div>
<ul class="list mx-4 rounded-box bg-base-200">
  {@render children()}
</ul>
