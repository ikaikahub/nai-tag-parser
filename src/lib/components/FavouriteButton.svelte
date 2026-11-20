<script lang="ts">
  import { toggleFavourite, type ImageRow } from '$lib/db/images';

  let { image }: { image: Pick<ImageRow, 'id' | 'favourite'> } = $props();
</script>

<button
  class={[
    'absolute right-2 bottom-2 z-10 cursor-pointer text-lg leading-none transition-opacity',
    !image.favourite && 'opacity-0 grayscale group-hover:opacity-60 focus-visible:opacity-60',
  ]}
  title={image.favourite ? 'Remove from favourites' : 'Add to favourites'}
  onclick={(e) => {
    e.stopPropagation();
    toggleFavourite(image);
  }}
>
  ⭐
</button>
