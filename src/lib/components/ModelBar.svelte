<script lang="ts">
  import SelectMenu from './SelectMenu.svelte';
  import { MODELS, MODES } from '$lib/napi';

  let {
    model = $bindable(),
    effort = $bindable(),
    mode = $bindable(),
  }: { model: string; effort: 'high' | 'medium'; mode: 'anime' | 'furry' } = $props();

  const hasEffort = $derived(MODELS.some((m) => m.id === model && m.mediumId));
</script>

<div class="flex items-center gap-1">
  <SelectMenu
    bind:value={model}
    options={MODELS.map((m) => ({ value: m.id, label: m.label }))}
    buttonClass="btn-sm flex-1"
  />
  {#if hasEffort}
    <button class="btn btn-sm" title="Effort" onclick={() => (effort = effort === 'high' ? 'medium' : 'high')}>
      {effort === 'high' ? '🔥 High' : '🌙 Medium'}
    </button>
  {/if}
  <button class="btn btn-sm" title="Mode" onclick={() => (mode = mode === 'anime' ? 'furry' : 'anime')}>
    {MODES[mode].label}
  </button>
</div>
