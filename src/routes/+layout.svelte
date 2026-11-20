<script lang="ts">
  import '../app.css';
  import { asset } from '$app/paths';
  import Modal from '$lib/components/Modal.svelte';
  import PromptText from '$lib/components/PromptText.svelte';
  import ToggleButton from '$lib/components/ToggleButton.svelte';
  import UpdateNotice from '$lib/components/UpdateNotice.svelte';
  import { exportBackup, importBackup } from '$lib/backup.svelte';
  import { account, refreshAccount } from '$lib/state/account.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { onMount } from 'svelte';

  let { children } = $props();

  let settingsOpen = $state(false);
  let helpOpen = $state(false);

  const PROMPT_EXAMPLE = `tags placed anywhere are included in the base prompt
/c denotes a character

/u denotes base undesired content

more base tags

/u more undesired content

/c character #2
/u undesired content for that character

// text after this until the next blank new line will be disabled
/c disabled character /u their undesired content

/c character #3 /u undesired content
/c character #4 /c character #5`;

  const KEYBINDS: readonly (readonly [keys: string[], action: string])[] = [
    [['Enter'], 'Generate (new line on mobile)'],
    [['Shift', 'Enter'], 'New line in the prompt'],
    [['↑', '↓', '←', '→'], 'Previous / next generation'],
    [['Ctrl', 'Scroll'], 'Zoom an image'],
    [['Esc'], 'Close a panel'],
  ];

  // without a key nothing can generate, so a visit starts by asking for one
  let keyPromptOpen = $state(!settings.apiKey);
  let keyInput = $state('');

  function saveKey(e: SubmitEvent) {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    settings.apiKey = key;
    keyPromptOpen = false;
    refreshAccount();
  }
  let backupMessage = $state('');

  onMount(refreshAccount);

  // the app has started, so the plain HTML loading screen from app.html can fade away
  onMount(() => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('leaving');
    setTimeout(() => splash.remove(), 300);
  });

  async function importFile() {
    backupMessage = '📂 Choose a backup file…';
    try {
      const imported = await importBackup();
      backupMessage = imported ? `✅ Imported ${imported.chunks} saved chunks and ${imported.prompts} favourites` : '';
      if (imported) refreshAccount();
    } catch (error) {
      backupMessage = `⚠️ ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async function exportFile() {
    backupMessage = '';
    try {
      if (await exportBackup()) backupMessage = '✅ Backup saved';
    } catch (error) {
      backupMessage = `⚠️ ${error instanceof Error ? error.message : String(error)}`;
    }
  }
</script>

<div class="flex h-dvh flex-col">
  <header class="flex h-10 shrink-0 items-center gap-4 border-b border-base-300 bg-base-200 px-3 md:h-12">
    <div class="flex items-center gap-2 text-sm font-semibold">
      <img src={asset('/favicon.png')} alt="" class="size-6" />Bocchi Tagger
      <button class="btn btn-ghost btn-sm btn-square" title="Help" onclick={() => (helpOpen = true)}>❓</button>
    </div>
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

<Modal bind:open={keyPromptOpen} title="🔑 Add your NovelAI API key">
  <form class="flex flex-col gap-3" onsubmit={saveKey}>
    <p class="text-sm opacity-80">
      A NovelAI API key is required to use Bocchi Tagger. The key is stored locally on this device.
    </p>
    <input class="input w-full font-mono" name="apiKey" autocomplete="off" placeholder="pst-..." bind:value={keyInput} />
    <p class="text-xs opacity-60">NovelAI → Account Settings → Get Persistent API Token</p>
    <button class="btn btn-primary" disabled={!keyInput.trim()}>Save</button>
  </form>
</Modal>

<Modal bind:open={helpOpen} title="How to use Bocchi Tagger">
  <div class="flex flex-col gap-3">
    <h4 class="font-semibold">Prompt syntax</h4>
    <div class="rounded-box bg-base-200 p-3 text-sm leading-6 break-words whitespace-pre-wrap">
      <PromptText text={PROMPT_EXAMPLE} />
    </div>

    <h4 class="mt-2 font-semibold">Keybinds</h4>
    <ul class="flex flex-col gap-2 text-sm">
      {#each KEYBINDS as [keys, action] (action)}
        <li class="flex items-center justify-between gap-3">
          <span class="flex gap-1">
            {#each keys as key (key)}<kbd class="kbd kbd-sm">{key}</kbd>{/each}
          </span>
          <span class="text-right opacity-80">{action}</span>
        </li>
      {/each}
    </ul>
  </div>
</Modal>

<Modal bind:open={settingsOpen} title="Settings">
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
        <button class="btn btn-sm flex-1" onclick={exportFile}>Export</button>
        <button class="btn btn-sm flex-1" onclick={importFile}>Import</button>
      </div>
      {#if backupMessage}<span class="text-xs">{backupMessage}</span>{/if}
    </div>
  </div>
</Modal>

<UpdateNotice />
