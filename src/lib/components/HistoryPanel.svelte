<script lang="ts">
  import { history, historySelection, loadMoreHistory } from '$lib/state/history.svelte';

  let { onselect }: { onselect: (id: number) => void } = $props();

  let buttons: Record<number, HTMLElement> = $state({});

  $effect(() => {
    if (historySelection.entryId !== null) buttons[historySelection.entryId]?.scrollIntoView({ block: 'nearest' });
  });

  function onscroll(e: Event & { currentTarget: HTMLElement }) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 300) loadMoreHistory();
  }
</script>

<div class="flex h-full w-28 shrink-0 flex-col gap-1 overflow-y-auto border-l border-base-300 bg-base-200 p-1 [scrollbar-width:thin]" {onscroll}>
  {#each history.items as entry (entry.id)}
    <button
      bind:this={buttons[entry.id]}
      class={[
        'relative shrink-0 overflow-hidden rounded-box border-2',
        historySelection.entryId === entry.id ? 'border-primary' : 'border-transparent',
      ]}
      onclick={() => onselect(entry.id)}
    >
      <img src={entry.images[0].src} alt="" loading="lazy" width={entry.width} height={entry.height} class="h-auto w-full" />
      {#if entry.images.length > 1}
        <span class="badge badge-sm absolute right-0.5 bottom-0.5">x{entry.images.length}</span>
      {/if}
    </button>
  {/each}
  {#if history.loading}
    <span class="loading loading-spinner mx-auto"></span>
  {/if}
</div>
