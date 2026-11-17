import { persisted } from './persisted.svelte';

export const settings = persisted('settings', {
  apiKey: null as string | null,
  historyOpen: true,
  sidebarWidth: 384,
  sidebarCollapsed: false,
  streamGeneration: true,
  blurStreamed: true,
});
