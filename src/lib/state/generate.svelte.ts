import { persisted } from './persisted.svelte';

export const generationSettings = persisted('generation', {
    model: 'nai-diffusion-5-full',
    effort: 'high' as 'high' | 'medium',
    mode: 'anime' as 'anime' | 'furry',
    quality: 'standard' as 'standard' | 'none',
    ucPreset: 'heavy',
    size: { width: 832, height: 1216 },
    samples: 1,
    params: {
        steps: 23,
        scale: 7,
        seed: null as number | null,
        sampler: 'k_euler_ancestral',
        cfg_rescale: 0,
    },
});

export const prompt = persisted('prompt', { text: '' });
