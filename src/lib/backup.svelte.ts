import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { favourites, type FavouritePrompt } from '$lib/state/favourites.svelte';
import { generationSettings, prompt } from '$lib/state/generate.svelte';
import { settings } from '$lib/state/settings.svelte';

// the web app exports the same shape from its settings dialog
export type WebBackup = {
  format: 'nai-ats-web';
  version: 1;
  favourites: { chunks: string[]; prompts: { text: string; backend: string; settings: unknown }[] };
  prompt: string;
  generationSettings: typeof generationSettings;
  apiKey: string | null;
};

export async function exportBackup() {
  const backup: WebBackup = {
    format: 'nai-ats-web',
    version: 1,
    favourites: { chunks: [...favourites.chunks], prompts: $state.snapshot(favourites.prompts) },
    prompt: prompt.text,
    generationSettings: $state.snapshot(generationSettings),
    apiKey: settings.apiKey,
  };

  const path = await save({
    defaultPath: `nai-ats-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!path) return false;
  await writeTextFile(path, JSON.stringify(backup, null, 2));
  return true;
}

// favourites are merged without duplicates, everything else is replaced
export async function importBackup() {
  const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (typeof path !== 'string') return null;

  const backup: WebBackup = JSON.parse(await readTextFile(path));
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
