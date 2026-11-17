<script lang="ts" module>
  export type FavouritesTab = 'chunks' | 'prompts';
</script>

<script lang="ts">
  import PromptText from './PromptText.svelte';
  import { favourites, removeChunk, removeFavourite, restoreFavourite, type RestoreMode } from '$lib/state/favourites.svelte';

  let {
    open = $bindable(),
    tab = $bindable(),
    oninsert,
  }: { open: boolean; tab: FavouritesTab; oninsert: (chunk: string) => void } = $props();

  const TEXT = 'text-sm leading-6 whitespace-pre-wrap break-words';

  let dialog = $state<HTMLDialogElement>();
  let armedDelete = $state<string | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  function pressDelete(key: string, remove: () => void) {
    if (armedDelete !== key) {
      armedDelete = key;
      return;
    }
    armedDelete = null;
    remove();
  }

  function insert(chunk: string) {
    oninsert(chunk);
    open = false;
  }

  function restore(index: number, mode: RestoreMode) {
    restoreFavourite(favourites.prompts[index], mode);
    open = false;
  }
</script>

{#snippet deleteButton(key: string, remove: () => void)}
  <button
    class={['btn btn-xs absolute top-2 right-2', armedDelete === key ? 'btn-error' : 'btn-ghost btn-square']}
    title="Delete"
    onclick={() => pressDelete(key, remove)}
  >
    {armedDelete === key ? 'Delete?' : '🗑️'}
  </button>
{/snippet}

<dialog
  bind:this={dialog}
  class="modal"
  onclose={() => {
    open = false;
    armedDelete = null;
  }}
>
  <div
    class={[
      'modal-box flex flex-col p-0',
      'max-md:size-full max-md:max-h-none max-md:max-w-none max-md:rounded-none',
      'md:h-[80dvh] md:w-full md:max-w-2xl',
    ]}
  >
    <div class="flex items-center gap-2 border-b border-base-300 p-2">
      <div class="tabs tabs-box tabs-sm flex-1" role="tablist">
        <button class="tab flex-1" class:tab-active={tab === 'chunks'} role="tab" onclick={() => (tab = 'chunks')}>
          ⭐ Saved
        </button>
        <button class="tab flex-1" class:tab-active={tab === 'prompts'} role="tab" onclick={() => (tab = 'prompts')}>
          ♥️ Favourites
        </button>
      </div>
      <button class="btn btn-ghost btn-sm btn-square" title="Close" onclick={() => (open = false)}>✕</button>
    </div>

    <div class="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
      <div class="mx-auto flex max-w-3xl flex-col gap-2">
        {#if tab === 'chunks'}
          {#each favourites.chunks as chunk, index (chunk)}
            <div class="relative rounded-box bg-base-200">
              <button class={[TEXT, 'block w-full cursor-pointer p-3 pr-20 text-left']} onclick={() => insert(chunk)}>
                <PromptText text={chunk} />
              </button>
              {@render deleteButton(`chunk-${index}`, () => removeChunk(index))}
            </div>
          {:else}
            <p class="p-6 text-center text-sm opacity-60">Select text in the prompt and press ⭐</p>
          {/each}
        {:else}
          {#each favourites.prompts as favourite, index (index)}
            <div class="relative flex flex-col gap-2 rounded-box bg-base-200 p-3 pr-20">
              <div class={TEXT}><PromptText text={favourite.text} /></div>
              <div class="flex flex-wrap gap-1">
                <button class="btn btn-sm" onclick={() => restore(index, 'text')}>Text</button>
                <button class="btn btn-sm" onclick={() => restore(index, 'settings')}>Text + settings</button>
                <button class="btn btn-sm" onclick={() => restore(index, 'seed')}>Text + settings + seed</button>
              </div>
              {@render deleteButton(`prompt-${index}`, () => removeFavourite(index))}
            </div>
          {:else}
            <p class="p-6 text-center text-sm opacity-60">Press ♥️ to save the prompt and its settings</p>
          {/each}
        {/if}
      </div>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
