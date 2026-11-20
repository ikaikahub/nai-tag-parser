<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  let {
    viewport = $bindable(),
    class: className,
    viewportClass,
    onscroll,
    children,
  }: {
    viewport: HTMLElement | undefined;
    class: ClassValue;
    viewportClass: ClassValue;
    onscroll: (e: Event & { currentTarget: HTMLElement }) => void;
    children: Snippet;
  } = $props();

  const MIN_THUMB = 24;
  const uid = $props.id();

  let scrollTop = $state(0);
  let scrollHeight = $state(0);
  let clientHeight = $state(0);
  let drag: { y: number; scrollTop: number } | null = null;

  const scrollRange = $derived(scrollHeight - clientHeight);
  const thumbHeight = $derived(scrollHeight ? Math.max((clientHeight * clientHeight) / scrollHeight, MIN_THUMB) : 0);
  const thumbRange = $derived(clientHeight - thumbHeight);
  const thumbTop = $derived(scrollRange > 0 ? (scrollTop / scrollRange) * thumbRange : 0);

  function measure() {
    if (!viewport) return;
    scrollTop = viewport.scrollTop;
    scrollHeight = viewport.scrollHeight;
    clientHeight = viewport.clientHeight;
  }

  $effect(() => {
    if (!viewport) return;
    const element = viewport;
    const resizes = new ResizeObserver(measure);
    const observeChildren = () => {
      resizes.disconnect();
      resizes.observe(element);
      for (const child of element.children) resizes.observe(child);
      measure();
    };
    const mutations = new MutationObserver(observeChildren);
    mutations.observe(element, { childList: true });
    observeChildren();
    return () => {
      resizes.disconnect();
      mutations.disconnect();
    };
  });

  function startDrag(e: PointerEvent & { currentTarget: HTMLElement }) {
    drag = { y: e.clientY, scrollTop };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function dragThumb(e: PointerEvent) {
    if (!drag || !viewport || thumbRange <= 0) return;
    viewport.scrollTop = drag.scrollTop + ((e.clientY - drag.y) * scrollRange) / thumbRange;
  }
</script>

<div class={['relative', className]}>
  <div
    bind:this={viewport}
    id={uid}
    class={['overflow-y-auto [scrollbar-width:none]', viewportClass]}
    onscroll={(e) => {
      measure();
      onscroll(e);
    }}
  >
    {@render children()}
  </div>

  {#if scrollRange > 0}
    <div // either do z-10 or z-30, 30 is above history tab, 10 is below, history tab is 20
      class="absolute top-0 right-0.5 z-10 w-1.5 cursor-pointer touch-none rounded-full bg-base-content/60 hover:bg-base-content/80"
      style:transform="translateY({thumbTop}px)"
      style:height="{thumbHeight}px"
      role="scrollbar"
      aria-controls={uid}
      aria-valuenow={Math.round((scrollTop / scrollRange) * 100)}
      tabindex="-1"
      onpointerdown={startDrag}
      onpointermove={dragThumb}
      onpointerup={() => (drag = null)}
    ></div>
  {/if}
</div>
