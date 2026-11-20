import { persisted } from './persisted.svelte';

export const settings = await persisted('settings.json', {
  apiKey: null as string | null,
  historyOpen: true,
  sidebarWidth: 384,
  sidebarCollapsed: false,
  streamGeneration: true,
  blurStreamed: true,
  // kept for the gallery and ComfyUI code that is not wired up yet
  comfyAddress: 'http://127.0.0.1:8188',
});
