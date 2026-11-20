<script lang="ts">
  import { getGenerationDetails, type GenerationDetails } from '$lib/db/generations';
  import { recordTexts } from '$lib/generation';

  let { image }: { image: { generation_id: number } | null } = $props();

  let details = $state<GenerationDetails | null>(null);

  $effect(() => {
    const id = image?.generation_id;
    details = null;
    if (id === undefined) return;
    getGenerationDetails(id).then((loaded) => {
      if (image?.generation_id === id) details = loaded;
    });
  });

  const text = $derived.by(() => {
    if (!details) return '';
    return [
      `Date: ${new Date(details.createdAt).toLocaleString()}`,
      ...recordTexts(details.record).flatMap(({ label, text }) => [`${label}:`, text]),
    ].join('\n');
  });
</script>

<pre
  class="min-h-0 flex-1 overflow-y-auto rounded-box bg-black/40 p-2 font-mono text-xs leading-snug break-words whitespace-pre-wrap select-text [scrollbar-width:thin]"
>{image ? text : 'Click an image to see its details'}</pre>
