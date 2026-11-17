<script lang="ts">
  import { tick, type Snippet } from 'svelte';

  let {
    open = $bindable(),
    title,
    children,
  }: { open: boolean; title: string; children: Snippet } = $props();

  let dialog = $state<HTMLDialogElement>();

  async function show(element: HTMLDialogElement) {
    element.showModal();
    await tick();
    await Promise.allSettled(element.getAnimations().map((animation) => animation.finished));
    const field =
      element.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-autofocus]') ??
      element.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    field?.focus();
    field?.select();
  }

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) show(dialog);
    if (!open && dialog.open) dialog.close();
  });
</script>

<!-- close and backdrop set open themselves, the close event is only relied on for Escape -->
<dialog bind:this={dialog} class="modal" onclose={() => (open = false)}>
  <div class="modal-box mb-(--keyboard-inset,0px) max-h-[calc(100dvh-2rem)] transition-[margin]">
    <div class="mb-4 flex items-start justify-between gap-2">
      <h3 class="text-lg font-bold">{title}</h3>
      <button class="btn btn-ghost btn-sm btn-square -mt-1 -mr-2" title="Close" onclick={() => (open = false)}>✕</button>
    </div>
    {@render children()}
  </div>
  <button class="modal-backdrop" aria-label="Close" onclick={() => (open = false)}></button>
</dialog>
