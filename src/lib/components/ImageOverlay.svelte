<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import ImageViewer from './ImageViewer.svelte';
  import type { Resolution } from '$lib/presets';
  import { ANIMATION_MS } from '$lib/theme';

  let {
    src,
    size,
    onclose,
    children,
  }: { src: string; size: Resolution; onclose: () => void; children: Snippet } = $props();
</script>

<div class="absolute inset-0 z-10 bg-black/50" transition:fade={{ duration: ANIMATION_MS }}>
  <ImageViewer {src} {size} onbackgroundclick={onclose}>{@render children()}</ImageViewer>
</div>
