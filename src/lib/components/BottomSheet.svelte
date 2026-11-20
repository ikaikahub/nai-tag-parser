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

<dialog bind:this={dialog} class="modal modal-bottom sm:modal-middle" onclose={() => (open = false)}>
  <div class="modal-box mb-(--keyboard-inset,0px) pb-[calc(1.5rem+env(safe-area-inset-bottom))] transition-[margin]">
    <div class="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-base-300 sm:hidden"></div>
    <h3 class="mb-4 text-lg font-bold">{title}</h3>
    {@render children()}
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
