<script lang="ts">
  import PromptText from './PromptText.svelte';

  let {
    value = $bindable(),
    selection = $bindable(),
    placeholder,
  }: {
    value: string;
    selection: { start: number; end: number };
    placeholder: string;
  } = $props();

  // textarea and the styled copy behind it must lay text out identically
  const TEXT_LAYOUT = 'px-3 py-2 text-sm leading-6 whitespace-pre-wrap break-words';

  let textarea = $state<HTMLTextAreaElement>();

  $effect(() => {
    if (textarea && (textarea.selectionStart !== selection.start || textarea.selectionEnd !== selection.end)) {
      textarea.setSelectionRange(selection.start, selection.end);
    }
  });

  function onselectionchange() {
    if (textarea && document.activeElement === textarea) {
      selection = { start: textarea.selectionStart, end: textarea.selectionEnd };
    }
  }
</script>

<svelte:document {onselectionchange} />

<div class="relative rounded-field border border-base-content/20 bg-base-100 focus-within:border-base-content/50">
  <div class={[TEXT_LAYOUT, 'pointer-events-none min-h-32']} aria-hidden="true">
    <PromptText text={value} />{' '}
  </div>

  <textarea
    bind:this={textarea}
    bind:value
    {placeholder}
    spellcheck="false"
    class={[
      TEXT_LAYOUT,
      'absolute inset-0 size-full resize-none overflow-hidden bg-transparent text-transparent caret-base-content outline-none',
      'placeholder:text-base-content/40',
    ]}
  ></textarea>
</div>
