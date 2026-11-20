<script lang="ts">
  import ZoomableImage from './ZoomableImage.svelte';
  import type { Resolution } from '$lib/presets';
  import { settings } from '$lib/state/settings.svelte';
  import { saveImage } from '$lib/images';

  type Image = { id: number; src: string | null; fileName?: string; relative_path?: string };
  type Box = { left: number; top: number; width: number; height: number };

  let { images, size, pending = false }: { images: Image[]; size: Resolution; pending?: boolean } = $props();

  const GAP = 8;

  let containerWidth = $state(0);
  let containerHeight = $state(0);

  // in a batch, tapping an image shows it alone at full size until it's tapped again
  let focusedId = $state<number | null>(null);
  const showsOne = $derived(images.length === 1 || images.some((image) => image.id === focusedId));

  // the largest grid of cells that fits, centred, with any short row first
  const cells = $derived.by(() => {
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
    const cellWidth = Math.max(Math.floor(best.cellWidth), 0);
    const cellHeight = Math.floor(cellWidth / aspect);
    const rowCount = Math.ceil(images.length / best.columns);
    const firstRowSize = images.length - (rowCount - 1) * best.columns;
    const gridTop = (containerHeight - rowCount * cellHeight - (rowCount - 1) * GAP) / 2;

    const boxes = new Map<number, Box>();
    images.forEach((image, index) => {
      const row = index < firstRowSize ? 0 : 1 + Math.floor((index - firstRowSize) / best.columns);
      const column = row === 0 ? index : (index - firstRowSize) % best.columns;
      const rowSize = row === 0 ? firstRowSize : Math.min(best.columns, images.length - firstRowSize - (row - 1) * best.columns);
      const rowLeft = (containerWidth - rowSize * cellWidth - (rowSize - 1) * GAP) / 2;
      boxes.set(image.id, {
        left: rowLeft + column * (cellWidth + GAP),
        top: gridTop + row * (cellHeight + GAP),
        width: cellWidth,
        height: cellHeight,
      });
    });
    return boxes;
  });

  // a single or focused image gets the whole area, so zooming can spread over it
  const fullBox = $derived({ left: GAP, top: GAP, width: containerWidth - 2 * GAP, height: containerHeight - 2 * GAP });

  function boxOf(image: Image) {
    if (pending || !showsOne) return cells.get(image.id);
    return images.length === 1 || image.id === focusedId ? fullBox : undefined;
  }

  let zoomables: Record<number, ZoomableImage> = $state({});

  // any tap on a focused image closes it, zoomed or not, and it goes back into the grid unzoomed
  function toggleFocus(image: Image) {
    if (images.length === 1) return;
    if (focusedId === image.id) {
      zoomables[image.id]?.resetZoom();
      focusedId = null;
    } else {
      focusedId = image.id;
    }
  }
</script>

<div bind:clientWidth={containerWidth} bind:clientHeight={containerHeight} class="relative size-full">
  {#each images as image (image.id)}
    {@const box = boxOf(image)}
    <div
      class={['group absolute', !box && 'hidden']}
      style:left="{box?.left ?? 0}px"
      style:top="{box?.top ?? 0}px"
      style:width="{box?.width ?? 0}px"
      style:height="{box?.height ?? 0}px"
    >
      {#if pending}
        <div class="grid size-full place-items-center overflow-hidden">
          {#if image.src}
            <img src={image.src} alt="" draggable="false" class={['size-full object-contain', settings.blurStreamed && 'blur-lg']} />
          {:else}
            <span class="loading loading-spinner"></span>
          {/if}
        </div>
      {:else if image.src}
        <div class={['size-full', showsOne ? 'cursor-zoom-in' : 'cursor-pointer']}>
          <ZoomableImage
            bind:this={zoomables[image.id]}
            src={image.src}
            {size}
            ontap={() => toggleFocus(image)}
            onzoomstart={() => images.length > 1 && (focusedId = image.id)}
          />
        </div>
        <button
          class={[
            'absolute right-2 bottom-2 z-10 text-lg leading-none transition-opacity',
            showsOne ? 'opacity-80' : 'opacity-0 group-hover:opacity-80 focus-visible:opacity-80',
          ]}
          title="Download"
          onclick={() => image.relative_path && image.fileName && saveImage(image.relative_path, image.fileName)}
        >
          💾
        </button>
      {/if}
    </div>
  {/each}
</div>
