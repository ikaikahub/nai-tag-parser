<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    icon,
    label,
    detail,
    onclick,
    children,
  }: { icon?: string; label: string; detail?: string; onclick?: () => void; children?: Snippet } = $props();
</script>

{#snippet content()}
  {#if icon}<span class="text-lg">{icon}</span>{/if}
  <div class="list-col-grow">
    <div>{label}</div>
    {#if detail}<div class="text-xs opacity-60">{detail}</div>{/if}
  </div>
  {@render children?.()}
{/snippet}

<li class={[!onclick && 'list-row items-center']}>
  {#if onclick}
    <button class="list-row w-full items-center text-left active:bg-base-300" {onclick}>
      {@render content()}
      <span class="text-xl leading-none opacity-40">›</span>
    </button>
  {:else}
    {@render content()}
  {/if}
</li>
