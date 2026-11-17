<script lang="ts">
  let {
    label,
    value = $bindable(),
    min,
    max,
    step = 1,
  }: { label: string; value: number; min: number; max: number; step?: number } = $props();
</script>

<div class="flex flex-col gap-1">
  <span class="text-sm font-semibold">{label}</span>
  <div class="flex items-center gap-2">
    <input type="number" name={label} class="input input-sm w-16 text-center" {min} {max} {step} bind:value />
    <input type="range" name={label} class="range range-sm flex-1" {min} {max} {step} bind:value />
  </div>
</div>
