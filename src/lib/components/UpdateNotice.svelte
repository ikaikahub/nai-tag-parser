<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { relaunch } from '@tauri-apps/plugin-process';
  import { check } from '@tauri-apps/plugin-updater';
  import { onMount } from 'svelte';

  // github.com release downloads have no CORS headers, but the API does
  const LATEST_RELEASE = 'https://api.github.com/repos/ikaikahub/nai-tag-parser/releases/latest';
  const ON_ANDROID = /android/i.test(navigator.userAgent);

  type AvailableUpdate = { tag: string; install: () => Promise<void> };

  let available = $state<AvailableUpdate | null>(null);
  let installing = $state(false);
  let installError = $state<string | null>(null);

  onMount(() => {
    (ON_ANDROID ? androidUpdate() : desktopUpdate()).then(
      (found) => (available = found),
      (error) => console.warn('Update check failed', error),
    );
  });

  // releases are tagged vN and the app version is 0.0.N
  const releaseNumber = (version: string) => Number(version.split('.').at(-1));

  async function desktopUpdate(): Promise<AvailableUpdate | null> {
    const update = await check();
    if (!update) return null;
    return {
      tag: `v${releaseNumber(update.version)}`,
      install: async () => {
        await update.downloadAndInstall();
        await relaunch();
      },
    };
  }

  // android has no updater plugin, so the browser downloads the APK and android offers to install it
  async function androidUpdate(): Promise<AvailableUpdate | null> {
    const response = await fetch(LATEST_RELEASE);
    if (!response.ok) return null;
    const release: { tag_name: string; assets: { name: string; browser_download_url: string }[] } = await response.json();
    const apk = release.assets.find((asset) => asset.name.endsWith('-android.apk'));
    const newer = Number(release.tag_name.slice(1)) > releaseNumber(await getVersion());
    if (!apk || !newer) return null;
    return { tag: release.tag_name, install: () => openUrl(apk.browser_download_url) };
  }

  async function install() {
    if (!available) return;
    installing = true;
    installError = null;
    try {
      await available.install();
      if (ON_ANDROID) available = null;
    } catch (error) {
      installError = `Update failed: ${error}`;
    } finally {
      installing = false;
    }
  }
</script>

{#if available}
  <div class="toast toast-center toast-bottom z-50" role="status">
    <div class="alert max-w-[90vw] text-sm shadow-lg">
      <span>{installError ?? (installing ? `Updating to ${available.tag}…` : `${available.tag} is available`)}</span>
      <button class="btn btn-sm btn-primary" disabled={installing} onclick={install}>Update</button>
      <button class="btn btn-ghost btn-sm btn-square" aria-label="Dismiss update" disabled={installing} onclick={() => (available = null)}>✕</button>
    </div>
  </div>
{/if}
