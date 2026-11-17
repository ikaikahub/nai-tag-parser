<script lang="ts">
  import ZoomableImage from './ZoomableImage.svelte';
  import type { Resolution } from '$lib/presets';
  import { settings } from '$lib/state/settings.svelte';

  type Image = { id: number; src: string | null; fileName?: string };

  let {
    images,
    size,
    enlargedId = $bindable(null),
    pending = false,
  }: { images: Image[]; size: Resolution; enlargedId?: number | null; pending?: boolean } = $props();

  const GAP = 8;

  let containerWidth = $state(0);
  let containerHeight = $state(0);

  const grid = $derived.by(() => {
    const aspect = size.width / size.height;
    const availableWidth = containerWidth - 2 * GAP;
    const availableHeight = containerHeight - 2 * GAP;
    let best = { columns: 1, cellWidth: 0 };
    for (let columns = 1; columns <= images.length; columns++) {
      const rowCount = Math.ceil(images.length / columns);
      const cellWidth = Math.min(
        (availableWidth - GAP * (columns - 1)) / columns,
        ((availableHeight - GAP * (rowCount - 1)) / rowCount) * aspect,
      );
      if (cellWidth > best.cellWidth) best = { columns, cellWidth };
    }
    const firstRowSize = images.length - (Math.ceil(images.length / best.columns) - 1) * best.columns;
    const rows = [images.slice(0, firstRowSize)];
    for (let start = firstRowSize; start < images.length; start += best.columns) rows.push(images.slice(start, start + best.columns));
    const cellWidth = Math.max(Math.floor(best.cellWidth), 0);
    return { rows, cellWidth, cellHeight: Math.floor(cellWidth / aspect) };
  });
</script>

{#snippet download(image: Image, visibility: string)}
  <a
    class={['absolute right-2 bottom-2 z-10 text-lg leading-none transition-opacity', visibility]}
    href={image.src}
    download={image.fileName}
    title="Download"
    onclick={(e) => e.stopPropagation()}
  >
    💾
  </a>
{/snippet}

<div
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  class="relative flex size-full flex-col items-center justify-center"
  style:gap="{GAP}px"
>
  {#each grid.rows as row, index (index)}
    <div class="flex" style:gap="{GAP}px">
      {#each row as image (image.id)}
        <div class="group relative" style:width="{grid.cellWidth}px" style:height="{grid.cellHeight}px">
          {#if pending}
            <div class="grid size-full place-items-center overflow-hidden">
              {#if image.src}
                <img src={image.src} alt="" draggable="false" class={['size-full object-contain', settings.blurStreamed && 'blur-lg']} />
              {:else}
                <span class="loading loading-spinner"></span>
              {/if}
            </div>
          {:else if image.src}
            <div class="size-full cursor-zoom-in">
              <ZoomableImage src={image.src} {size} ontap={() => (enlargedId = image.id)} />
            </div>
          {/if}
          {#if !pending}{@render download(image, 'opacity-0 group-hover:opacity-80 focus-visible:opacity-80')}{/if}
        </div>
      {/each}
    </div>
  {/each}
</div>
