<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    side,
    class: className,
    children,
    ...rest
  }: HTMLButtonAttributes & { side: 'left' | 'right' | 'top' } = $props();

  const SIDE_CLASSES = {
    right: 'top-2 left-full rounded-r-box border-l-0 px-1 py-2',
    left: 'top-2 right-full rounded-l-box border-r-0 px-1 py-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 rounded-t-box border-b-0 px-4 py-3',
  };
</script>

<button
  class={[
    'absolute z-20 border border-base-300 bg-base-200 text-xs leading-none hover:bg-base-300',
    SIDE_CLASSES[side],
    className,
  ]}
  {...rest}
>
  {@render children?.()}
</button>
