import { favourites, type FavouritePrompt } from '$lib/state/favourites.svelte';
import { generationSettings, prompt } from '$lib/state/generate.svelte';
import { settings } from '$lib/state/settings.svelte';

// the Tauri app exports this same shape from Settings → Backup → Export for web
export type WebBackup = {
  format: 'nai-ats-web';
  version: 1;
  favourites: { chunks: string[]; prompts: { text: string; backend: string; settings: unknown }[] };
  prompt: string;
  generationSettings: typeof generationSettings;
  apiKey: string | null;
};

export function exportBackup() {
  const backup: WebBackup = {
    format: 'nai-ats-web',
    version: 1,
    favourites: { chunks: [...favourites.chunks], prompts: $state.snapshot(favourites.prompts) },
    prompt: prompt.text,
    generationSettings: $state.snapshot(generationSettings),
    apiKey: settings.apiKey,
  };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  link.download = `nai-ats-backup-${new Date().toISOString().slice(0, 10)}.json`;
  // Firefox drops downloads from detached links or URLs revoked straight away, and the page behind an open dialog is inert
  (document.querySelector('dialog[open]') ?? document.body).append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

// favourites are merged without duplicates, everything else is replaced
export async function importBackup(file: File) {
  const backup: WebBackup = JSON.parse(await file.text());
  if (backup.format !== 'nai-ats-web') throw new Error('Not a NAI ATS backup file');

  for (const chunk of backup.favourites.chunks) {
    if (!favourites.chunks.includes(chunk)) favourites.chunks.push(chunk);
  }
  const savedPrompts = new Set(favourites.prompts.map((favourite) => JSON.stringify(favourite)));
  const novelAiPrompts = backup.favourites.prompts.filter((favourite) => favourite.backend === 'novelai') as FavouritePrompt[];
  for (const favourite of novelAiPrompts) {
    if (!savedPrompts.has(JSON.stringify(favourite))) favourites.prompts.push(favourite);
  }

  prompt.text = backup.prompt;
  Object.assign(generationSettings, backup.generationSettings);
  if (backup.apiKey) settings.apiKey = backup.apiKey;
  return { chunks: backup.favourites.chunks.length, prompts: novelAiPrompts.length };
}
