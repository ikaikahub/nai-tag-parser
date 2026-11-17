<script lang="ts">
  import '../app.css';
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import ToggleButton from '$lib/components/ToggleButton.svelte';
  import { exportBackup, importBackup } from '$lib/backup.svelte';
  import { account, refreshAccount } from '$lib/state/account.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { onMount } from 'svelte';

  let { children } = $props();

  let settingsOpen = $state(false);
  let backupMessage = $state('');
  let importInput = $state<HTMLInputElement>();

  onMount(refreshAccount);

  // also runs when the page regains focus, since Firefox on Android may hand over the file without any event
  async function importFile() {
    const file = importInput?.files?.[0];
    if (!importInput || !file) return;
    importInput.value = '';
    backupMessage = `📂 Reading ${file.name}…`;
    try {
      const imported = await importBackup(file);
      backupMessage = `✅ Imported ${imported.chunks} saved chunks and ${imported.prompts} favourites`;
      refreshAccount();
    } catch (error) {
      backupMessage = `⚠️ ${error instanceof Error ? error.message : String(error)}`;
    }
  }
</script>

<svelte:window onfocus={() => setTimeout(importFile, 300)} />

<div class="flex h-dvh flex-col">
  <header class="flex h-10 shrink-0 items-center gap-4 border-b border-base-300 bg-base-200 px-3 md:h-12">
    <span class="text-sm font-semibold">🔥 NAI Advanced Tag Manager</span>
    {#if account.usage}
      <div class="ml-auto flex gap-4 text-sm max-md:hidden">
        <span title="Opus generations left">{account.usage.opus_percentage}%</span>
        <span class="font-semibold">{(account.usage.fixed_anlas + account.usage.purchased_anlas).toLocaleString()} Anlas</span>
      </div>
    {/if}
    <button
      class={['btn btn-ghost btn-sm btn-square', !account.usage && 'ml-auto']}
      title="Settings"
      onclick={() => {
        backupMessage = '';
        settingsOpen = true;
      }}
    >
      ⚙️
    </button>
  </header>

  <main class="relative min-h-0 min-w-0 flex-1">
    {@render children()}
  </main>
</div>

<BottomSheet bind:open={settingsOpen} title="Settings">
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1">
      <span class="text-sm">🔑 API key</span>
      <input
        class="input w-full font-mono"
        name="apiKey"
        autocomplete="off"
        placeholder="pst-..."
        bind:value={() => settings.apiKey ?? '', (key) => (settings.apiKey = key.trim() || null)}
        onchange={refreshAccount}
      />
      <span class="text-xs opacity-60">NovelAI → Account Settings → Get Persistent API Token</span>
      {#if account.error}<span class="text-xs text-error">{account.error}</span>{/if}
    </label>

    <div class="flex items-center justify-between gap-2">
      <span class="text-sm">📡 Stream image generation</span>
      <ToggleButton bind:checked={settings.streamGeneration}>{settings.streamGeneration ? 'On' : 'Off'}</ToggleButton>
    </div>
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm">🌫️ Blur streamed previews</span>
      <ToggleButton bind:checked={settings.blurStreamed}>{settings.blurStreamed ? 'On' : 'Off'}</ToggleButton>
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-sm">💾 Backup</span>
      <span class="text-xs opacity-60">Saved chunks, favourites, prompt, settings and API key</span>
      <div class="flex gap-2">
        <button class="btn btn-sm flex-1" onclick={exportBackup}>Export</button>
        <!-- a label instead of input.click() because Firefox on Android can skip change events for hidden inputs -->
        <label class="btn btn-sm flex-1">
          Import
          <input
            bind:this={importInput}
            type="file"
            class="sr-only"
            onclick={() => (backupMessage = '📂 Choose a backup file')}
            onchange={importFile}
            oninput={importFile}
            oncancel={() => (backupMessage = 'No file picked')}
          />
        </label>
      </div>
      {#if backupMessage}<span class="text-xs">{backupMessage}</span>{/if}
    </div>
  </div>
</BottomSheet>
