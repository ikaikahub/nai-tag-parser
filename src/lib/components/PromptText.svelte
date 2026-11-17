<script lang="ts">
  import { parsePrompt, type Segment } from '$lib/prompt';

  let { text }: { text: string } = $props();

  const lines = $derived(parsePrompt(text).lines);

  // stronger tint the further the weight is from 1, like NovelAI's own prompt box
  function weightColour(weight: number) {
    if (Math.abs(weight - 1) < 1e-6) return undefined;
    const colour = weight < 0 ? '--color-error' : weight > 1 ? '--color-warning' : '--color-info';
    const strength = weight < 0 ? 0.5 + Math.abs(weight) / 4 : Math.abs(Math.log(weight)) / Math.log(1.6);
    return `color-mix(in oklab, var(${colour}) ${Math.round(30 + 55 * Math.min(1, strength))}%, var(--color-base-content))`;
  }

  // neighbouring blocks get different tints so they are easy to tell apart
  const BLOCK_TINTS = ['--color-primary', '--color-secondary', '--color-accent', '--color-info'];

  const KIND_CLASSES: Record<Segment['kind'], string> = {
    marker: 'text-primary/70',
    emphasis: 'text-base-content/50',
    text: '',
  };
</script>

{#each lines as segments, lineIndex (lineIndex)}{lineIndex ? '\n' : ''}{#each segments as segment, index (index)}<span
      class={[KIND_CLASSES[segment.kind], segment.disabled && 'opacity-35']}
      style:background-color={`color-mix(in oklab, var(${BLOCK_TINTS[segment.blockNumber % BLOCK_TINTS.length]}) 12%, transparent)`}
      style:color={segment.kind === 'text' ? weightColour(segment.weight) : undefined}>{segment.text}</span
    >{/each}{/each}
