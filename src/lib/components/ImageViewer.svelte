<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Resolution } from '$lib/presets';

  let {
    src,
    size,
    onbackgroundclick,
    children,
  }: { src: string; size: Resolution; onbackgroundclick?: () => void; children: Snippet } = $props();

  let container = $state<HTMLElement>();
  let image = $state<HTMLImageElement>();
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  const fitScale = $derived(Math.min(containerWidth / size.width, containerHeight / size.height));
  let scale = $state(1);
  let x = $state(0);
  let y = $state(0);
  let drag = $state<{ x: number; y: number } | null>(null);
  let pinch: number | null = null;

  const zoomed = $derived(scale > 1);

  function reset() {
    scale = 1;
    x = 0;
    y = 0;
  }

  function zoomTo(el: HTMLElement, clientX: number, clientY: number, next: number) {
    const r = el.getBoundingClientRect();
    const cx = clientX - r.left - r.width / 2;
    const cy = clientY - r.top - r.height / 2;
    next = Math.min(Math.max(next, 1), 10);
    x = cx - (cx - x) * (next / scale);
    y = cy - (cy - y) * (next / scale);
    scale = next;
    if (scale === 1) reset();
  }

  const distance = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  $effect(() => {
    if (!container) return;
    const el = container;
    const onwheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !zoomed) return;
      e.preventDefault();
      zoomTo(el, e.clientX, e.clientY, scale * Math.exp(-e.deltaY * 0.0015));
    };
    const ontouchstart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinch = distance(e.touches);
      drag = null;
    };
    const ontouchmove = (e: TouchEvent) => {
      if (pinch === null || e.touches.length !== 2) return;
      e.preventDefault();
      const d = distance(e.touches);
      const [a, b] = [e.touches[0], e.touches[1]];
      zoomTo(el, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, (scale * d) / pinch);
      pinch = d;
    };
    const ontouchend = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };
    el.addEventListener('wheel', onwheel, { passive: false });
    el.addEventListener('touchstart', ontouchstart);
    el.addEventListener('touchmove', ontouchmove, { passive: false });
    el.addEventListener('touchend', ontouchend);
    return () => {
      el.removeEventListener('wheel', onwheel);
      el.removeEventListener('touchstart', ontouchstart);
      el.removeEventListener('touchmove', ontouchmove);
      el.removeEventListener('touchend', ontouchend);
    };
  });

  let pressedAt: { x: number; y: number } | null = null;

  function startPan(e: PointerEvent & { currentTarget: HTMLElement }) {
    pressedAt = { x: e.clientX, y: e.clientY };
    if (!zoomed || pinch !== null) return;
    drag = { x: e.clientX - x, y: e.clientY - y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function pan(e: PointerEvent) {
    if (!drag || pinch !== null) return;
    x = e.clientX - drag.x;
    y = e.clientY - drag.y;
  }

  function toggleZoom(el: HTMLElement, clientX: number, clientY: number) {
    if (zoomed) return reset();
    const fillScale = Math.max(containerWidth / size.width, containerHeight / size.height);
    zoomTo(el, clientX, clientY, fillScale / fitScale);
  }

  function onclick(e: MouseEvent & { currentTarget: HTMLElement }) {
    const moved = pressedAt && Math.hypot(e.clientX - pressedAt.x, e.clientY - pressedAt.y) > 4;
    if (moved || !image) return;
    const rect = image.getBoundingClientRect();
    const onImage = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (onImage) toggleZoom(e.currentTarget, e.clientX, e.clientY);
    else onbackgroundclick?.();
  }

  function onkeydown(e: KeyboardEvent & { currentTarget: HTMLElement }) {
    if (e.key !== 'Enter') return;
    const rect = e.currentTarget.getBoundingClientRect();
    toggleZoom(e.currentTarget, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
</script>

<div
  bind:this={container}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  class={[
    'grid size-full place-items-center overflow-hidden',
    zoomed ? 'touch-none' : 'touch-pan-y',
    zoomed && (drag ? 'cursor-grabbing' : 'cursor-grab'),
  ]}
  role="button"
  tabindex="0"
  aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
  onpointerdown={startPan}
  onpointermove={pan}
  onpointerup={() => (drag = null)}
  {onclick}
  {onkeydown}
>
  <div class="group relative" style:width="{size.width * fitScale}px" style:height="{size.height * fitScale}px">
    <img
      bind:this={image}
      {src}
      alt=""
      loading="lazy"
      draggable="false"
      width={size.width}
      height={size.height}
      class={['size-full', !zoomed && 'cursor-zoom-in']}
      style:transform="translate({x}px, {y}px) scale({scale})"
    />
    {#if !zoomed}{@render children()}{/if}
  </div>
</div>
