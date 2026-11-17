<script lang="ts">
  import type { Resolution } from '$lib/presets';

  let {
    src,
    size,
    zoomed = $bindable(false),
    doubleTapZoom = false,
    ontap,
  }: {
    src: string;
    size: Resolution;
    zoomed?: boolean;
    doubleTapZoom?: boolean;
    ontap?: (onImage: boolean) => void;
  } = $props();

  const MAX_SCALE = 10;
  const DOUBLE_TAP_MS = 300;
  // further than this between press and release is a drag, not a tap
  const TAP_DISTANCE = 8;

  let container = $state<HTMLElement>();
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  const fitScale = $derived(Math.min(containerWidth / size.width, containerHeight / size.height) || 0);
  const fittedWidth = $derived(size.width * fitScale);
  const fittedHeight = $derived(size.height * fitScale);

  let scale = $state(1);
  let x = $state(0);
  let y = $state(0);
  let animate = $state(false);

  $effect(() => {
    zoomed = scale > 1;
  });

  // keeps the image edges from being pulled inside the frame
  function clampOffset() {
    const maxX = Math.max(0, (fittedWidth * scale - containerWidth) / 2);
    const maxY = Math.max(0, (fittedHeight * scale - containerHeight) / 2);
    x = Math.min(Math.max(x, -maxX), maxX);
    y = Math.min(Math.max(y, -maxY), maxY);
  }

  // zooms around a screen point so the spot under the fingers or cursor stays put
  function zoomAt(clientX: number, clientY: number, nextScale: number) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const fromCenterX = clientX - rect.left - rect.width / 2;
    const fromCenterY = clientY - rect.top - rect.height / 2;
    nextScale = Math.min(Math.max(nextScale, 1), MAX_SCALE);
    x = fromCenterX - (fromCenterX - x) * (nextScale / scale);
    y = fromCenterY - (fromCenterY - y) * (nextScale / scale);
    scale = nextScale;
    if (scale < 1.01) {
      scale = 1;
      x = 0;
      y = 0;
    }
    clampOffset();
  }

  function toggleZoom(clientX: number, clientY: number) {
    animate = true;
    if (zoomed) {
      scale = 1;
      x = 0;
      y = 0;
    } else {
      const fillScale = Math.max(containerWidth / size.width, containerHeight / size.height) / fitScale;
      zoomAt(clientX, clientY, Math.max(fillScale, 2.5));
    }
  }

  let pinch: { distance: number; scale: number; midX: number; midY: number } | null = null;

  const touchDistance = (touches: TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  // wheel and touchmove need passive: false to block page scrolling, which Svelte's handlers can't set
  $effect(() => {
    if (!container) return;
    const element = container;

    const onwheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      animate = false;
      zoomAt(e.clientX, e.clientY, scale * Math.exp(-e.deltaY * 0.0015));
    };

    const ontouchstart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pan = null;
      animate = false;
      pinch = {
        distance: touchDistance(e.touches),
        scale,
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    };

    const ontouchmove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      // moving both fingers together pans, spreading them zooms
      x += midX - pinch.midX;
      y += midY - pinch.midY;
      zoomAt(midX, midY, (pinch.scale * touchDistance(e.touches)) / pinch.distance);
      pinch.midX = midX;
      pinch.midY = midY;
    };

    const ontouchend = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };

    element.addEventListener('wheel', onwheel, { passive: false });
    element.addEventListener('touchstart', ontouchstart);
    element.addEventListener('touchmove', ontouchmove, { passive: false });
    element.addEventListener('touchend', ontouchend);
    element.addEventListener('touchcancel', ontouchend);
    return () => {
      element.removeEventListener('wheel', onwheel);
      element.removeEventListener('touchstart', ontouchstart);
      element.removeEventListener('touchmove', ontouchmove);
      element.removeEventListener('touchend', ontouchend);
      element.removeEventListener('touchcancel', ontouchend);
    };
  });

  let pan: { pointerX: number; pointerY: number; x: number; y: number } | null = $state(null);
  let press: { x: number; y: number } | null = null;
  let lastTap: { time: number; x: number; y: number } | null = null;

  function onpointerdown(e: PointerEvent & { currentTarget: HTMLElement }) {
    press = { x: e.clientX, y: e.clientY };
    if (!zoomed || pinch || !e.isPrimary) return;
    // while zoomed, dragging belongs to the image and not to the feed or gallery swipes
    e.stopPropagation();
    animate = false;
    pan = { pointerX: e.clientX, pointerY: e.clientY, x, y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onpointermove(e: PointerEvent) {
    if (!pan || pinch) return;
    x = pan.x + e.clientX - pan.pointerX;
    y = pan.y + e.clientY - pan.pointerY;
    clampOffset();
  }

  function onpointerup(e: PointerEvent) {
    pan = null;
    const tapped = press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_DISTANCE;
    press = null;
    if (!tapped || pinch || !e.isPrimary) return;

    const rect = container!.querySelector('img')!.getBoundingClientRect();
    const onImage = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    const now = performance.now();
    const isDoubleTap =
      doubleTapZoom &&
      onImage &&
      lastTap &&
      now - lastTap.time < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < TAP_DISTANCE * 3;

    if (isDoubleTap) {
      lastTap = null;
      toggleZoom(e.clientX, e.clientY);
      return;
    }
    lastTap = { time: now, x: e.clientX, y: e.clientY };
    ontap?.(onImage);
  }
</script>

<div
  bind:this={container}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  class={[
    'grid size-full place-items-center overflow-hidden select-none',
    zoomed && 'touch-none',
    zoomed && (pan ? 'cursor-grabbing' : 'cursor-grab'),
  ]}
  role="application"
  aria-label="Zoomable image"
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={() => (pan = press = null)}
>
  <img
    {src}
    alt=""
    draggable="false"
    width={size.width}
    height={size.height}
    class={['max-w-none', animate && 'transition-transform duration-200 ease-out']}
    style:width="{fittedWidth}px"
    style:height="{fittedHeight}px"
    style:transform="translate({x}px, {y}px) scale({scale})"
  />
</div>
