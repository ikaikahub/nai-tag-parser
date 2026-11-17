<script lang="ts" generics="T extends string | number">
  let {
    value = $bindable(),
    options,
    alignEnd = false,
    buttonClass = 'btn-ghost',
    title,
    onchange,
  }: {
    value: T;
    options: { value: T; label: string }[];
    alignEnd?: boolean;
    buttonClass?: string;
    title?: string;
    onchange?: (value: T) => void;
  } = $props();

  const uid = $props.id();
  let menu = $state<HTMLElement>();

  const current = $derived(options.find((o) => o.value === value));

  function pick(next: T) {
    value = next;
    menu?.hidePopover();
    onchange?.(next);
  }
</script>

<button
  class={['btn min-w-0 justify-between gap-2 font-normal', buttonClass]}
  popovertarget="select-{uid}"
  style:anchor-name="--select-{uid}"
  {title}
>
  <span class="truncate">{current?.label ?? ''}</span>▾
</button>
<ul
  bind:this={menu}
  id="select-{uid}"
  popover
  class={['dropdown menu w-48 rounded-box bg-base-100 shadow', alignEnd && 'dropdown-end']}
  style:position-anchor="--select-{uid}"
>
  {#each options as o (o.value)}
    <li><button class:menu-active={o.value === value} onclick={() => pick(o.value)}>{o.label}</button></li>
  {/each}
</ul>
