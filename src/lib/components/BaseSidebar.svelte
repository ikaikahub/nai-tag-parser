<script lang="ts">
  import type { Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { fade, slide } from 'svelte/transition';
  import CollapseTab from './CollapseTab.svelte';
  import { keyboard } from '$lib/state/keyboard.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { ANIMATION_MS } from '$lib/theme';

  let {
    open = $bindable(false),
    icon,
    title,
    children,
    footer,
  }: { open?: boolean; icon: string; title: string; children: Snippet; footer: Snippet } = $props();

  const isDesktop = new MediaQuery('min-width: 768px');

  let resizing: { x: number; width: number } | null = null;

  function startResize(e: PointerEvent & { currentTarget: HTMLElement }) {
    if (settings.sidebarCollapsed) return;
    e.preventDefault();
    resizing = { x: e.clientX, width: settings.sidebarWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function resize(e: PointerEvent) {
    if (resizing) settings.sidebarWidth = Math.min(Math.max(resizing.width + e.clientX - resizing.x, 240), 800);
  }

  let innerHeight = $state(0);
  let dragHeight = $state<number | null>(null);
  let drag: { y: number; height: number; moved: boolean } | null = null;

  const openHeight = $derived(Math.max(innerHeight * 0.7 - keyboard.inset, 0));
  const height = $derived(dragHeight ?? (open ? openHeight : 0));

  function startDrag(e: PointerEvent & { currentTarget: HTMLElement }) {
    drag = { y: e.clientY, height, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveDrag(e: PointerEvent) {
    if (!drag) return;
    const delta = drag.y - e.clientY;
    if (Math.abs(delta) > 4) drag.moved = true;
    dragHeight = Math.min(Math.max(drag.height + delta, 0), openHeight);
  }

  let body = $state<HTMLElement>();

  function revealFocused() {
    const focused = document.activeElement;
    if (body && focused instanceof HTMLElement && body.contains(focused)) focused.scrollIntoView({ block: 'nearest' });
  }

  $effect(() => {
    if (!body) return;
    const observer = new ResizeObserver(revealFocused);
    observer.observe(body);
    return () => observer.disconnect();
  });

  function endDrag() {
    if (!drag) return;
    open = drag.moved ? (dragHeight ?? 0) > openHeight / 2 : !open;
    drag = null;
    dragHeight = null;
  }
</script>

<svelte:window bind:innerHeight />

{#if open && !isDesktop.current}
  <button
    class="fixed inset-0 z-10 bg-black/30"
    aria-label="Hide {title}"
    transition:fade={{ duration: 200 }}
    onclick={() => (open = false)}
  ></button>
{/if}

{#if !settings.sidebarCollapsed || !isDesktop.current}
  <aside
    class={[
      'flex shrink-0 flex-col gap-3 bg-base-200 p-2 md:h-full md:w-(--w)',
      'max-md:fixed max-md:inset-x-0 max-md:bottom-(--keyboard-inset,0px) max-md:z-20 max-md:gap-0 max-md:rounded-t-box',
      'max-md:border-t max-md:border-base-300 max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
      'max-md:transition-[bottom] max-md:duration-200 max-md:ease-out',
    ]}
    style:--w="{settings.sidebarWidth}px"
    transition:slide={{ axis: 'x', duration: ANIMATION_MS }}
  >
    <CollapseTab
      side="top"
      class="touch-none text-base md:hidden"
      title={open ? `Hide ${title}` : `Show ${title}`}
      onpointerdown={startDrag}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
    >
      {icon}
    </CollapseTab>

    <div
      class={[
        'flex min-h-0 flex-col gap-3 md:flex-1',
        'max-md:overflow-hidden',
        dragHeight === null && 'max-md:transition-[height] max-md:duration-200 max-md:ease-out',
      ]}
      style:height={isDesktop.current ? undefined : `${height}px`}
    >
      <div
        bind:this={body}
        class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:none] max-md:pb-3"
        onfocusin={() => requestAnimationFrame(revealFocused)}
      >
        {@render children()}
      </div>
    </div>

    {@render footer()}
  </aside>
{/if}

<div class="relative z-20 hidden shrink-0 md:block">
  <div
    class={['h-full w-1 bg-base-300', !settings.sidebarCollapsed && 'cursor-col-resize hover:bg-primary']}
    role="separator"
    aria-orientation="vertical"
    onpointerdown={startResize}
    onpointermove={resize}
    onpointerup={() => (resizing = null)}
  ></div>
  <CollapseTab
    side="right"
    title={settings.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
    onclick={() => (settings.sidebarCollapsed = !settings.sidebarCollapsed)}
  >
    {settings.sidebarCollapsed ? '▶' : '◀'}
  </CollapseTab>
</div>
