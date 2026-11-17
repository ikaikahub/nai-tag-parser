import { buildRequest, generateImages, MEDIUM_PARAMS, MODES, resolveModel, type GenerateRequest } from '$lib/napi';
import { QUALITY_TAGS, UC_PRESETS } from '$lib/presets';
import { buildPrompt } from '$lib/prompt';
import { joinTags } from '$lib/tags';
import { generationSettings, prompt } from '$lib/state/generate.svelte';
import { saveGeneration } from '$lib/state/history.svelte';
import { settings } from '$lib/state/settings.svelte';

export function buildGeneration() {
  const built = buildPrompt(prompt.text);
  const model = resolveModel(generationSettings.model, generationSettings.effort);
  const ucPreset = UC_PRESETS[generationSettings.model]?.find((preset) => preset.id === generationSettings.ucPreset);
  const quality = generationSettings.quality === 'standard' ? QUALITY_TAGS : '';
  return buildRequest({
    ...generationSettings.params,
    ...(model !== generationSettings.model ? MEDIUM_PARAMS : {}),
    model,
    prompt: joinTags(MODES[generationSettings.mode].prefix, built.base, quality),
    undesired: joinTags(ucPreset?.tags ?? '', built.undesired),
    characters: built.characters,
    ...generationSettings.size,
    samples: generationSettings.samples,
    seed: generationSettings.params.seed ?? Math.floor(Math.random() * 2 ** 32),
  });
}

export function recordTexts(request: GenerateRequest) {
  return [
    { label: 'Prompt', text: request.input },
    { label: 'Negative prompt', text: request.parameters.negative_prompt },
    ...request.parameters.characterPrompts.flatMap((character, index) => [
      { label: `Character ${index + 1} prompt`, text: character.prompt },
      { label: `Character ${index + 1} negative prompt`, text: character.uc },
    ]),
  ];
}

function imageMime(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  return 'image/webp';
}

export async function runGeneration(onpreview?: (image: string, index: number) => void) {
  if (!settings.apiKey) throw new Error('Add your API key in ⚙️ Settings');
  const promptText = prompt.text;
  const request = buildGeneration();
  const size = { ...generationSettings.size };
  const images = (await generateImages(settings.apiKey, request, onpreview)).map((image) => {
    const bytes = Uint8Array.from(atob(image.image), (character) => character.charCodeAt(0));
    return { blob: new Blob([bytes], { type: imageMime(bytes) }), seed: image.seed };
  });
  await saveGeneration({ createdAt: Date.now(), ...size, promptText, request, images });
}
