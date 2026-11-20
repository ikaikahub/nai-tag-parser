<script lang="ts">
  let { message }: { message: string } = $props();
</script>

<div class="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
  <span class="text-5xl">🗄️</span>
  <h1 class="text-lg font-bold">The database couldn't be opened</h1>
  <p class="opacity-70">The database is corrupt or didn't match the expected schema</p>
  <a href="/settings" class="btn btn-primary btn-sm">⚙️ Open Settings</a>
  <code class="text-xs break-all opacity-50">{message}</code>
</div>
