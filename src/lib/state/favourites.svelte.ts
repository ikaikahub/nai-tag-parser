import { generationSettings, prompt } from './generate.svelte';
import { persisted } from './persisted.svelte';

type NovelAiSettings = typeof generationSettings;

export type FavouritePrompt = { text: string; backend: 'novelai'; settings: NovelAiSettings };

export const favourites = persisted('favourites', {
  chunks: [] as string[],
  prompts: [] as FavouritePrompt[],
});

export function favouriteChunk(text: string) {
  if (!favourites.chunks.includes(text)) favourites.chunks.unshift(text);
}

function currentFavourite(): FavouritePrompt {
  return { text: prompt.text, backend: 'novelai', settings: $state.snapshot(generationSettings) };
}

export function isCurrentPromptFavourite() {
  const json = JSON.stringify(currentFavourite());
  return favourites.prompts.some((existing) => JSON.stringify(existing) === json);
}

export function favouriteCurrentPrompt() {
  if (!isCurrentPromptFavourite()) favourites.prompts.unshift(currentFavourite());
}

export function restoreFavourite(favourite: FavouritePrompt, withSettings: boolean) {
  prompt.text = favourite.text;
  if (withSettings) Object.assign(generationSettings, $state.snapshot(favourite).settings);
}

export function removeChunk(index: number) {
  favourites.chunks.splice(index, 1);
}

export function removeFavourite(index: number) {
  favourites.prompts.splice(index, 1);
}
