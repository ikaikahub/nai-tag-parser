<script lang="ts">
  import SelectMenu from './SelectMenu.svelte';
  import { RESOLUTIONS, type Orientation, type Resolution } from '$lib/presets';

  let { size = $bindable(), allowAny = false }: { size: Resolution | null; allowAny?: boolean } = $props();

  const ORIENTATIONS: { id: Orientation; label: string }[] = [
    { id: 'landscape', label: 'H' },
    { id: 'portrait', label: 'V' },
    { id: 'square', label: 'S' },
  ];

  const PRESETS = Object.entries(RESOLUTIONS).flatMap(([category, sizes]) =>
    Object.entries(sizes).map(([orientation, s]) => ({ category, orientation: orientation as Orientation, ...s })),
  );

  const preset = $derived(size && PRESETS.find((p) => p.width === size!.width && p.height === size!.height));
  const category = $derived(!size ? '' : (preset?.category ?? 'Custom'));
  const orientation = $derived(preset?.orientation ?? null);

  let lastCustom = $state<Resolution | null>(null);
  $effect(() => {
    if (size && !preset) lastCustom = { ...size };
  });

  function pickCategory(value: string) {
    if (!value) size = null;
    else if (value === 'Custom') size = lastCustom ?? size;
    else {
      const sizes = RESOLUTIONS[value];
      size = { ...(sizes[orientation ?? 'portrait'] ?? sizes.portrait!) };
    }
  }

  function pickOrientation(o: Orientation) {
    if (preset) size = { ...RESOLUTIONS[preset.category][o]! };
  }

  function setDimension(key: keyof Resolution, value: number) {
    const snapped = Math.max(64, Math.round(value / 64) * 64);
    size = { width: size?.width ?? snapped, height: size?.height ?? snapped, [key]: snapped };
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <span class="text-sm font-semibold">Resolution</span>
    <span class="flex items-center text-sm opacity-70">
      {#each ['width', 'height'] as const as key, i (key)}
        {#if i}<span class="px-1">×</span>{/if}
        <input
          type="number"
          name={key}
          step="64"
          class={[
            'w-12 bg-transparent [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none',
            i ? 'text-left' : 'text-right',
          ]}
          placeholder="any"
          value={size?.[key] ?? ''}
          onchange={(e) => e.currentTarget.value && setDimension(key, e.currentTarget.valueAsNumber)}
        />
      {/each}
    </span>
  </div>

  <div class="flex gap-1">
    <SelectMenu
      value={category}
      options={[
        ...(allowAny ? [{ value: '', label: 'Any size' }] : []),
        ...Object.keys(RESOLUTIONS).map((c) => ({ value: c, label: c })),
        { value: 'Custom', label: 'Custom' },
      ]}
      buttonClass="btn-sm flex-1"
      onchange={pickCategory}
    />
    <div class="join">
      {#each ORIENTATIONS as o (o.id)}
        <button
          class="btn btn-sm join-item"
          class:btn-primary={orientation === o.id}
          title={o.id}
          disabled={!preset || !RESOLUTIONS[preset.category][o.id]}
          onclick={() => pickOrientation(o.id)}
        >
          {o.label}
        </button>
      {/each}
    </div>
  </div>
</div>
