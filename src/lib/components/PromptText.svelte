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

  // each character's /c and /u markers share a muted colour, spread around the colour wheel by the golden angle
  // so neighbouring characters always look different, and /u outside a character gets a plain one
  const markerColour = (characterNumber: number | null) =>
    characterNumber === null ? 'oklch(0.45 0.02 260)' : `oklch(0.45 0.09 ${(characterNumber * 137.508) % 360})`;

  function segmentBackground(segment: Segment) {
    if (segment.disabled) return 'color-mix(in oklab, var(--color-base-content) 8%, transparent)';
    if (segment.kind === 'marker' && /\/[cu]/.test(segment.text)) return markerColour(segment.characterNumber);
  }

  const KIND_CLASSES: Record<Segment['kind'], string> = {
    marker: 'text-primary/70',
    emphasis: 'text-base-content/50',
    text: '',
  };
</script>

{#each parsed.lines as segments, lineIndex (lineIndex)}{lineIndex ? '\n' : ''}{#each segments as segment, index (index)}<span
      class={[KIND_CLASSES[segment.kind], segment.disabled && 'opacity-35']}
      style:background-color={segmentBackground(segment)}
      style:background-image={segment.emphasised ? weightBackground(segment.weight) : undefined}>{segment.text}</span
    >{/each}{/each}
