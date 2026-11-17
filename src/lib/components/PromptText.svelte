<script lang="ts">
  import { parsePrompt, type Segment } from '$lib/prompt';

  let { text }: { text: string } = $props();

  const parsed = $derived(parsePrompt(text));

  // weights blend between these, negatives get the wider range since they are usable much further out
  const WEIGHT_COLOURS: readonly (readonly [number, string])[] = [
    [-3, '#7b3fb5'],
    [-1.5, '#8b5cf6'],
    [0, '#14b8a6'],
    [1, '#22c55e'],
    [2, '#ff4d4d'],
  ];

  // only text inside weight syntax gets a background, at half strength so the text stays readable
  function weightBackground(weight: number) {
    const clamped = Math.min(Math.max(weight, WEIGHT_COLOURS[0][0]), WEIGHT_COLOURS.at(-1)![0]);
    const upper = Math.max(WEIGHT_COLOURS.findIndex(([stop]) => stop >= clamped), 1);
    const [lowStop, lowColour] = WEIGHT_COLOURS[upper - 1];
    const [highStop, highColour] = WEIGHT_COLOURS[upper];
    const share = (clamped - lowStop) / (highStop - lowStop);
    const colour = `color-mix(in oklab, ${highColour} ${Math.round(share * 100)}%, ${lowColour})`;
    const faded = `color-mix(in oklab, ${colour} 50%, transparent)`;
    // a gradient layers it over the tint of disabled text
    return `linear-gradient(${faded}, ${faded})`;
  }

  // /c markers and disabled text get tints, neighbouring ones differ so they are easy to tell apart
  const BLOCK_TINTS = ['--color-primary', '--color-secondary', '--color-accent', '--color-info'];

  const KIND_CLASSES: Record<Segment['kind'], string> = {
    marker: 'text-primary/70',
    emphasis: 'text-base-content/50',
    text: '',
  };
</script>

{#each parsed.lines as segments, lineIndex (lineIndex)}{lineIndex ? '\n' : ''}{#each segments as segment, index (index)}<span
      class={[KIND_CLASSES[segment.kind], segment.disabled && 'opacity-35']}
      style:background-color={segment.disabled || (segment.kind === 'marker' && segment.text.trim() === '/c')
        ? `color-mix(in oklab, var(${BLOCK_TINTS[segment.blockNumber % BLOCK_TINTS.length]}) 12%, transparent)`
        : undefined}
      style:background-image={segment.emphasised ? weightBackground(segment.weight) : undefined}>{segment.text}</span
    >{/each}{/each}
