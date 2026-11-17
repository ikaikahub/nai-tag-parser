<script lang="ts">
  import Modal from './Modal.svelte';
  import { buildGeneration, recordTexts } from '$lib/generation';

  let { open = $bindable() }: { open: boolean } = $props();

  const preview = $derived.by(() => {
    if (!open) return null;
    try {
      return { blocks: recordTexts(buildGeneration()), error: '' };
    } catch (e) {
      return { blocks: [], error: e instanceof Error ? e.message : String(e) };
    }
  });
</script>

{#snippet block(label: string, text: string)}
  <div class="flex flex-col gap-1">
    <span class="text-xs font-semibold opacity-60">{label}</span>
    <p class="rounded-box bg-base-200 p-2 text-sm break-words whitespace-pre-wrap select-text">{text || '–'}</p>
  </div>
{/snippet}

<Modal bind:open title="Prompt that will be sent">
  {#if preview?.error}
    <p class="text-sm text-error">⚠️ {preview.error}</p>
  {:else if preview}
    <div class="flex max-h-[60dvh] flex-col gap-3 overflow-y-auto [scrollbar-width:thin]">
      {#each preview.blocks as { label, text } (label)}
        {@render block(label, text)}
      {/each}
    </div>
  {/if}
</Modal>
