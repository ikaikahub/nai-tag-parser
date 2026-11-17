<script lang="ts">
  import { fade } from 'svelte/transition';
  import ZoomableImage from './ZoomableImage.svelte';
  import { ANIMATION_MS } from '$lib/theme';

  type GalleryImage = { id: number; src: string; fileName: string; width: number; height: number };

  let {
    images,
    currentId = $bindable(),
    onnearend,
  }: { images: GalleryImage[]; currentId: number | null; onnearend: () => void } = $props();

  const SLIDE_MS = 250;
  // how far a swipe has to travel, as a share of the screen, to change image or close
  const SWIPE_SHARE = 0.2;
  const CLOSE_DISTANCE = 120;
  // a quick flick counts even if it's short
  const FLICK_SPEED = 0.5;

  let width = $state(0);
  let currentZoomed = $state(false);

  const index = $derived(images.findIndex((image) => image.id === currentId));
  const visible = $derived(
    [index - 1, index, index + 1].filter((slide) => slide >= 0 && slide < images.length).map((slide) => ({ slide, image: images[slide] })),
  );
  const current = $derived(images[index]);

  $effect(() => {
    if (index >= images.length - 3) onnearend();
  });

  let swipe: { pointerId: number; startX: number; startY: number; time: number; axis: 'x' | 'y' | null } | null = null;
  let offsetX = $state(0);
  let offsetY = $state(0);
  let animating = $state(false);

  function settle(update: () => void) {
    animating = true;
    update();
    setTimeout(() => (animating = false), SLIDE_MS);
  }

  function go(direction: 1 | -1) {
    const next = images[index + direction];
    settle(() => {
      if (next) currentId = next.id;
      offsetX = 0;
    });
  }

  function onpointerdown(e: PointerEvent & { currentTarget: HTMLElement }) {
    // a second finger means a pinch, which the image handles
    if (!e.isPrimary || currentZoomed) {
      swipe = null;
      offsetX = offsetY = 0;
      return;
    }
    swipe = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, time: performance.now(), axis: null };
  }

  function onpointermove(e: PointerEvent & { currentTarget: HTMLElement }) {
    if (!swipe || e.pointerId !== swipe.pointerId) return;
    const dx = e.clientX - swipe.startX;
    const dy = e.clientY - swipe.startY;
    if (!swipe.axis && Math.hypot(dx, dy) > 8) {
      swipe.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // resist past the first and last image
    if (swipe.axis === 'x') offsetX = (index === 0 && dx > 0) || (index === images.length - 1 && dx < 0) ? dx / 3 : dx;
    if (swipe.axis === 'y') offsetY = Math.max(dy, 0);
  }

  function onpointerup(e: PointerEvent) {
    if (!swipe || e.pointerId !== swipe.pointerId) return;
    const { axis, time } = swipe;
    const speed = Math.abs(axis === 'x' ? offsetX : offsetY) / (performance.now() - time);
    swipe = null;

    if (axis === 'x') {
      const far = Math.abs(offsetX) > width * SWIPE_SHARE || speed > FLICK_SPEED;
      if (far && offsetX < 0 && index < images.length - 1) go(1);
      else if (far && offsetX > 0 && index > 0) go(-1);
      else settle(() => (offsetX = 0));
    } else if (axis === 'y') {
      if (offsetY > CLOSE_DISTANCE || speed > FLICK_SPEED) currentId = null;
      else settle(() => (offsetY = 0));
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') currentId = null;
    else if (e.key === 'ArrowRight' && !currentZoomed) go(1);
    else if (e.key === 'ArrowLeft' && !currentZoomed) go(-1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
</script>

<svelte:window {onkeydown} />

<div
  class="fixed inset-0 z-50 touch-none overflow-hidden"
  role="dialog"
  aria-modal="true"
  aria-label="Image viewer"
  tabindex="-1"
  bind:clientWidth={width}
  transition:fade={{ duration: ANIMATION_MS }}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={() => settle(() => (offsetX = offsetY = 0))}
>
  <div class="absolute inset-0 bg-black" style:opacity={Math.max(1 - offsetY / 400, 0.2)}></div>

  <div
    class={['absolute inset-0', animating && 'transition-transform ease-out']}
    style:transition-duration="{SLIDE_MS}ms"
    style:transform="translate({offsetX - index * width}px, {offsetY}px) scale({1 - Math.min(offsetY / 2000, 0.15)})"
  >
    {#each visible as { slide, image } (image.id)}
      <div class="absolute inset-y-0 w-full" style:left="{slide * width}px">
        <ZoomableImage
          src={image.src}
          size={image}
          doubleTapZoom
          bind:zoomed={() => (slide === index ? currentZoomed : false), (zoomed) => slide === index && (currentZoomed = zoomed)}
          ontap={(onImage) => !onImage && (currentId = null)}
        />
      </div>
    {/each}
  </div>

  {#if current && !currentZoomed}
    <a
      class="absolute right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] text-2xl leading-none opacity-80"
      href={current.src}
      download={current.fileName}
      title="Download"
      onpointerdown={(e) => e.stopPropagation()}
    >
      💾
    </a>
  {/if}
</div>
