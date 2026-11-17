<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  let {
    checked = $bindable(),
    size = 'sm',
    class: className,
    title,
    children,
  }: { checked: boolean; size?: 'xs' | 'sm'; class?: ClassValue; title?: string; children: Snippet } = $props();

  const SIZES = { xs: 'btn-xs', sm: 'btn-sm' };
</script>

<button class={['btn', SIZES[size], checked && 'btn-primary', className]} {title} onclick={() => (checked = !checked)}>
  {@render children()}
</button>
