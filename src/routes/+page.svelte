<script lang="ts">
  import BaseSidebar from '$lib/components/BaseSidebar.svelte';
  import ScrollArea from '$lib/components/ScrollArea.svelte';
  import PromptEditor from '$lib/components/PromptEditor.svelte';
  import FavouritesBar from '$lib/components/FavouritesBar.svelte';
  import GenerationSettings from '$lib/components/GenerationSettings.svelte';
  import HistoryPanel from '$lib/components/HistoryPanel.svelte';
  import { fade, slide } from 'svelte/transition';
  import { ANIMATION_MS } from '$lib/theme';
  import GenerationView from '$lib/components/GenerationView.svelte';
  import CollapseTab from '$lib/components/CollapseTab.svelte';
  import { addNewestHistory, history, historySelection, loadMoreHistory } from '$lib/state/history.svelte';
  import { onMount, tick } from 'svelte';
  import { page } from '$app/state';
  import { MediaQuery } from 'svelte/reactivity';
  import ImageSettings from '$lib/components/ImageSettings.svelte';
  import ModelBar from '$lib/components/ModelBar.svelte';
  import SelectMenu from '$lib/components/SelectMenu.svelte';
  import PromptPreview from '$lib/components/PromptPreview.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { runGeneration } from '$lib/generation';
  import { anlasCost, MEDIUM_PARAMS, resolveModel } from '$lib/napi';
  import { account, refreshAccount } from '$lib/state/account.svelte';
  import { maxSamples, QUALITY_TAGS, UC_PRESETS, type Resolution } from '$lib/presets';
  import { generationSettings, prompt } from '$lib/state/generate.svelte';

  let previewOpen = $state(false);
  let selection = $state({ start: 0, end: 0 });

  const ucPresets = $derived(UC_PRESETS[generationSettings.model] ?? []);

  const model = $derived(resolveModel(generationSettings.model, generationSettings.effort));
  const medium = $derived(model !== generationSettings.model);
  const cost = $derived(
    anlasCost({
      model,
      ...generationSettings.size,
      steps: medium ? MEDIUM_PARAMS.steps : generationSettings.params.steps,
      samples: generationSettings.samples,
      account: account.usage,
    }),
  );

  const canGenerate = $derived(cost !== null);


  onMount(() => {
    if (!isDesktop.current) settings.historyOpen = false;
    if (!history.items.length) loadMoreHistory();
  });

  let feed = $state<HTMLElement>();
  let feedObserver = $state<IntersectionObserver>();

  $effect(() => {
    if (!feed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) historySelection.entryId = Number((entry.target as HTMLElement).dataset.id);
        }
      },
      { root: feed, threshold: 0.6 },
    );
    feedObserver = observer;
    return () => observer.disconnect();
  });

  function observeFeedItem(el: HTMLElement) {
    const observer = feedObserver;
    if (!observer) return;
    observer.observe(el);
    return () => observer.unobserve(el);
  }

  let scrolledDown = $state(false);

  function onFeedScroll(e: Event & { currentTarget: HTMLElement }) {
    const el = e.currentTarget;
    scrolledDown = el.scrollTop > el.clientHeight / 2;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 3 * el.clientHeight) loadMoreHistory();
  }

  function scrollFeedTo(top: number) {
    const el = feed;
    if (!el) return;
    const start = el.scrollTop;
    const startTime = performance.now();
    el.style.scrollSnapType = 'none';
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / (ANIMATION_MS * 2), 1);
      el.scrollTop = start + (top - start) * (1 - (1 - progress) ** 3);
      if (progress < 1) requestAnimationFrame(step);
      else el.style.scrollSnapType = '';
    };
    requestAnimationFrame(step);
  }

  function scrollToEntry(id: number) {
    historySelection.entryId = id;
    historySelection.enlargedImageId = null;
    const target = feed?.querySelector(`[data-id="${id}"]`);
    if (feed && target) scrollFeedTo(target.getBoundingClientRect().top - feed.getBoundingClientRect().top + feed.scrollTop);
  }

  function stepHistory(direction: 1 | -1) {
    const index = history.items.findIndex((entry) => entry.id === historySelection.entryId) + direction;
    const next = history.items[index];
    if (next) scrollToEntry(next.id);
    if (index >= history.items.length - 5) loadMoreHistory();
  }


  const isDesktop = new MediaQuery('min-width: 768px');

  let drawerOpen = $state(false);

  let generating = $state(false);
  let error = $state('');

  async function generateImage() {
    if (generating || !canGenerate) return;
    drawerOpen = false;
    generating = true;
    error = '';
    pending = { size: { ...generationSettings.size }, previews: Array.from({ length: generationSettings.samples }, () => null) };
    tick().then(() => scrollFeedTo(0));
    try {
      await runGeneration(settings.streamGeneration ? showPreview : undefined);
      refreshAccount();
      await addNewestHistory();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      generating = false;
      pending = null;
    }
  }

  let pending = $state<{ size: Resolution; previews: (string | null)[] } | null>(null);

  function showPreview(image: string, index: number) {
    if (pending) pending.previews[index] = `data:${imageMime(image)};base64,${image}`;
  }

  const imageMime = (base64: string) =>
    base64.startsWith('/9j/') ? 'image/jpeg' : base64.startsWith('iVBOR') ? 'image/png' : 'image/webp';

  function onkeydown(e: KeyboardEvent) {
    if (page.route.id !== '/') return;
    const target = e.target as HTMLElement;
    const isField = target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;
    if (e.isComposing || target.closest('dialog, [popover]') || document.querySelector('dialog[open]')) return;

    const generatesFromHere = isField ? isDesktop.current : !target.closest('button, a, [role="button"]');
    if (e.key === 'Enter' && !e.shiftKey && generatesFromHere) {
      e.preventDefault();
      generateImage();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isField) {
      e.preventDefault();
      stepHistory(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Escape') {
      historySelection.enlargedImageId = null;
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="flex h-full">
  <BaseSidebar bind:open={drawerOpen} icon="🪶" title="prompt">
    <ModelBar bind:model={generationSettings.model} bind:effort={generationSettings.effort} bind:mode={generationSettings.mode} />

    <FavouritesBar bind:value={prompt.text} bind:selection />

    <PromptEditor bind:value={prompt.text} bind:selection placeholder="Tags" />

    <div class="flex items-center gap-1">
      <SelectMenu
        bind:value={generationSettings.quality}
        options={[
          { value: 'standard', label: 'Quality: Standard' },
          { value: 'none', label: 'Quality: None' },
        ]}
        buttonClass="btn-ghost btn-xs"
        title={generationSettings.quality === 'standard' ? QUALITY_TAGS : 'No quality tags'}
      />
      <SelectMenu
        bind:value={generationSettings.ucPreset}
        options={ucPresets.map((preset) => ({ value: preset.id, label: `UC: ${preset.label}` }))}
        buttonClass="btn-ghost btn-xs"
        title={ucPresets.find((preset) => preset.id === generationSettings.ucPreset)?.tags || 'No UC preset tags'}
      />
      <button
        class="ml-auto cursor-pointer text-xs underline decoration-dotted opacity-50 hover:opacity-80"
        onclick={() => (previewOpen = true)}
      >
        show full prompt
      </button>
    </div>

    <ImageSettings
      bind:size={generationSettings.size}
      bind:samples={generationSettings.samples}
      limit={(size) => maxSamples(size.width, size.height)}
    />

    <GenerationSettings
      bind:params={generationSettings.params}
      {medium}
      lastSeed={history.items[0]?.images[0]?.seed}
    />
    {#snippet footer()}
      <button class="btn btn-primary w-full" disabled={generating || !canGenerate} onclick={generateImage}>
        {#if generating}<span class="loading loading-spinner loading-sm"></span>{/if}
        Generate · {cost === null ? 'Too large' : cost === 0 ? 'Free' : `${cost} Anlas`}
      </button>
    {/snippet}
  </BaseSidebar>

  <section class="flex h-full min-w-0 flex-1 max-md:pb-15">
    <div class="relative min-w-0 flex-1">
      {#if history.items.length || pending}
        <ScrollArea
          bind:viewport={feed}
          class="h-full"
          viewportClass="flex h-full snap-y snap-mandatory flex-col gap-[10dvh] [overflow-anchor:none]"
          onscroll={onFeedScroll}
        >
          {#if pending}
            <div class="h-full shrink-0 snap-start">
              <GenerationView
                pending
                size={pending.size}
                images={pending.previews.map((src, index) => ({ id: index, src }))}
              />
            </div>
          {/if}
          {#each history.items as entry (entry.id)}
            <div class="h-full shrink-0 snap-start" data-id={entry.id} {@attach observeFeedItem}>
              <GenerationView images={entry.images} size={entry} bind:enlargedId={historySelection.enlargedImageId} />
            </div>
          {/each}
        </ScrollArea>
      {:else}
        <p class="grid h-full place-items-center opacity-50">Your image will show up here</p>
      {/if}

      {#if scrolledDown}
        <button
          class="btn btn-sm absolute top-2 left-1/2 -translate-x-1/2"
          transition:fade={{ duration: ANIMATION_MS }}
          onclick={() => scrollFeedTo(0)}
        >
          ⬆️ Go to top
        </button>
      {/if}

      {#if error}
        <div class="alert alert-error absolute inset-x-2 bottom-2">{error}</div>
      {/if}
    </div>

    <div class="relative z-20 h-full">
      <CollapseTab
        side="left"
        title={settings.historyOpen ? 'Hide history' : 'Show history'}
        onclick={() => (settings.historyOpen = !settings.historyOpen)}
      >
        🕘
      </CollapseTab>
      {#if settings.historyOpen}
        <div class="h-full" transition:slide={{ axis: 'x', duration: ANIMATION_MS }}>
          <HistoryPanel onselect={scrollToEntry} />
        </div>
      {/if}
    </div>
  </section>
</div>

<PromptPreview bind:open={previewOpen} />

