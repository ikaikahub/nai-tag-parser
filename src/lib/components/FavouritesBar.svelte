<script lang="ts">
  import FavouritesScreen, { type FavouritesTab } from './FavouritesScreen.svelte';
  import { insertChunk } from '$lib/prompt';
  import { favouriteChunk, favouriteCurrentPrompt, isCurrentPromptFavourite } from '$lib/state/favourites.svelte';

  let {
    value = $bindable(),
    selection = $bindable(),
  }: { value: string; selection: { start: number; end: number } } = $props();

  let screenOpen = $state(false);
  let screenTab = $state<FavouritesTab>('chunks');

  const selectedText = $derived(value.slice(selection.start, selection.end).trim());
  const promptSaved = $derived(isCurrentPromptFavourite());

  function saveSelection() {
    favouriteChunk(selectedText);
    selection = { start: selection.end, end: selection.end };
  }

  function openScreen(tab: FavouritesTab) {
    screenTab = tab;
    screenOpen = true;
  }
</script>

<div class="flex gap-1">
  <button
    class="btn btn-sm btn-square"
    title="Save the selected text as a chunk"
    disabled={!selectedText}
    onpointerdown={(e) => e.preventDefault()}
    onclick={saveSelection}
  >
    ⭐
  </button>
  <button
    class="btn btn-sm btn-square"
    title={promptSaved ? 'This prompt and settings are saved' : 'Save the prompt and settings'}
    disabled={!value.trim() || promptSaved}
    onclick={favouriteCurrentPrompt}
  >
    ♥️
  </button>

  <button class="btn btn-sm flex-1" onclick={() => openScreen('chunks')}>⭐ Saved chunks</button>
  <button class="btn btn-sm flex-1" onclick={() => openScreen('prompts')}>♥️ Favourite prompts</button>
</div>

<FavouritesScreen
  bind:open={screenOpen}
  bind:tab={screenTab}
  oninsert={(chunk) => (value = insertChunk(value, selection.end, chunk))}
/>
