<script lang="ts">
  import SelectMenu from './SelectMenu.svelte';
  import SliderField from './SliderField.svelte';
  import { SAMPLERS } from '$lib/napi';

  type Params = { steps: number; scale: number; seed: number | null; sampler: string; cfg_rescale: number };

  let {
    params = $bindable(),
    medium,
    lastSeed,
  }: { params: Params; medium: boolean; lastSeed: number | undefined } = $props();
</script>

<div class="flex flex-col gap-3">
  {#if !medium}
    <SliderField label="Steps" bind:value={params.steps} min={1} max={50} />
  {/if}
  <SliderField label="Prompt Guidance" bind:value={params.scale} min={0} max={10} step={0.1} />
  <div class="flex gap-2">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-sm font-semibold">Seed</span>
      <div class="join">
        <input class="input input-sm join-item w-full" type="number" name="seed" placeholder="Random" bind:value={params.seed} />
        <button
          type="button"
          class={['btn btn-sm join-item', params.seed !== null && 'btn-active']}
          title={params.seed !== null ? 'Back to a random seed' : "Use last generation's seed"}
          disabled={params.seed === null && lastSeed === undefined}
          onclick={() => (params.seed = params.seed !== null ? null : (lastSeed ?? null))}
        >
          🌱
        </button>
      </div>
    </div>
    {#if !medium}
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <span class="text-sm font-semibold">Sampler</span>
        <SelectMenu bind:value={params.sampler} options={SAMPLERS} buttonClass="btn-sm w-full" />
      </div>
    {/if}
  </div>
  {#if !medium}
    <SliderField label="Prompt Guidance Rescale" bind:value={params.cfg_rescale} min={0} max={1} step={0.02} />
  {/if}
</div>
