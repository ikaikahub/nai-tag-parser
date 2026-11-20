<script lang="ts">
  import SelectMenu from './SelectMenu.svelte';
  import SliderField from './SliderField.svelte';
  import type { SeedControl } from '$lib/comfy';
  import { comfy, comfyChoices, comfyOptions } from '$lib/state/comfy.svelte';

  let { lastSeed }: { lastSeed: number | undefined } = $props();

  const SEED_CONTROLS: { value: SeedControl; label: string }[] = [
    { value: 'fixed', label: 'Fixed' },
    { value: 'increment', label: 'Increment' },
    { value: 'decrement', label: 'Decrement' },
    { value: 'randomize', label: 'Randomize' },
  ];

  function setSeed(value: number) {
    if (!Number.isNaN(value)) comfy.seed = Math.max(Math.floor(value), 0);
  }
</script>

<div class="flex flex-col gap-3">
  <SliderField label="Steps" bind:value={comfy.steps} min={1} max={100} />
  <SliderField label="CFG" bind:value={comfy.cfg} min={0} max={20} step={0.1} />
  <SliderField label="Denoise" bind:value={comfy.denoise} min={0} max={1} step={0.01} />
  <div class="flex gap-2">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-sm font-semibold">Sampler</span>
      <SelectMenu bind:value={comfy.sampler} options={comfyChoices(comfyOptions.samplers, comfy.sampler)} buttonClass="btn-sm w-full" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-sm font-semibold">Scheduler</span>
      <SelectMenu bind:value={comfy.scheduler} options={comfyChoices(comfyOptions.schedulers, comfy.scheduler)} buttonClass="btn-sm w-full" />
    </div>
  </div>
  <div class="flex gap-2">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-sm font-semibold">Seed</span>
      <div class="join">
        <input
          class="input input-sm join-item w-full"
          type="number"
          name="seed"
          min="0"
          value={comfy.seed}
          onchange={(e) => setSeed(e.currentTarget.valueAsNumber)}
        />
        <button
          class="btn btn-sm join-item"
          title="Use last generation's seed"
          disabled={lastSeed === undefined}
          onclick={() => lastSeed !== undefined && setSeed(lastSeed)}
        >
          🌱
        </button>
      </div>
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-sm font-semibold">After generating</span>
      <SelectMenu bind:value={comfy.seedControl} options={SEED_CONTROLS} buttonClass="btn-sm w-full" />
    </div>
  </div>
</div>
