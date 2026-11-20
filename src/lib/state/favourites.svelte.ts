import { generationSettings, prompt } from './generate.svelte';
import { history } from './history.svelte';
import { persisted } from './persisted.svelte';

type NovelAiSettings = typeof generationSettings;

export type FavouritePrompt = { text: string; backend: 'novelai'; settings: NovelAiSettings };

export type RestoreMode = 'text' | 'settings' | 'seed';

export const favourites = await persisted('favourites.json', {
  chunks: [] as string[],
  prompts: [] as FavouritePrompt[],
});

export function favouriteChunk(text: string) {
  if (!favourites.chunks.includes(text)) favourites.chunks.unshift(text);
}

// a random seed is saved as the latest image's seed, so restoring with the seed reproduces it
function currentFavourite(): FavouritePrompt {
  const settings = $state.snapshot(generationSettings);
  settings.params.seed ??= history.items[0]?.images[0]?.seed ?? null;
  return { text: prompt.text, backend: 'novelai', settings };
}

export function isCurrentPromptFavourite() {
  const json = JSON.stringify(currentFavourite());
  return favourites.prompts.some((existing) => JSON.stringify(existing) === json);
}

export function favouriteCurrentPrompt() {
  if (!isCurrentPromptFavourite()) favourites.prompts.unshift(currentFavourite());
}

export function restoreFavourite(favourite: FavouritePrompt, mode: RestoreMode) {
  prompt.text = favourite.text;
  if (mode === 'text') return;
  const settings = $state.snapshot(favourite).settings;
  if (mode === 'settings') settings.params.seed = generationSettings.params.seed;
  Object.assign(generationSettings, settings);
}

export function removeChunk(index: number) {
  favourites.chunks.splice(index, 1);
}

export function removeFavourite(index: number) {
  favourites.prompts.splice(index, 1);
}
