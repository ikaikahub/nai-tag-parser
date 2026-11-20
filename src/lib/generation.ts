import { BaseDirectory, mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { buildRequest, generateImages, MEDIUM_PARAMS, MODES, resolveModel, type GenerateRequest } from '$lib/napi';
import { saveGeneration, type GenerationRecord } from '$lib/db/generations';
import { QUALITY_TAGS, UC_PRESETS } from '$lib/presets';
import { buildPrompt } from '$lib/prompt';
import { joinTags, parseTags } from '$lib/tags';
import { generationSettings, prompt } from '$lib/state/generate.svelte';
import { settings } from '$lib/state/settings.svelte';

export function buildGeneration(): GenerateRequest {
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

export function recordTexts(record: GenerationRecord) {
  if ('backend' in record) {
    return [
      { label: 'Prompt', text: record.prompt },
      { label: 'Negative prompt', text: record.negative },
    ];
  }
  return [
    { label: 'Prompt', text: record.input },
    { label: 'Negative prompt', text: record.parameters.negative_prompt },
    ...record.parameters.characterPrompts.flatMap((character, index) => [
      { label: `Character ${index + 1} prompt`, text: character.prompt },
      { label: `Character ${index + 1} negative prompt`, text: character.uc },
    ]),
  ];
}

function imageExtension(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  return 'webp';
}

export async function runGeneration(onpreview?: (image: string, index: number) => void) {
  if (!settings.apiKey) throw new Error('Add your API key in ⚙️ Settings');
  const promptText = prompt.text;
  const request = buildGeneration();
  const size = { ...generationSettings.size };

  const images = (await generateImages(settings.apiKey, request, onpreview)).map((image) => {
    const bytes = Uint8Array.from(atob(image.image), (character) => character.charCodeAt(0));
    return { bytes, extension: imageExtension(bytes), seed: image.seed };
  });

  const dir = `images/${new Date().toISOString().slice(0, 10)}`;
  await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });

  const saved = [];
  for (const image of images) {
    const path = `${dir}/${crypto.randomUUID()}.${image.extension}`;
    await writeFile(path, image.bytes, { baseDir: BaseDirectory.AppData });
    saved.push({ path, seed: image.seed });
  }

  const built = buildPrompt(promptText);
  const tags = parseTags(joinTags(built.base, ...built.characters.map((character) => character.prompt)));
  await saveGeneration(request, promptText, size, tags, saved);
}
