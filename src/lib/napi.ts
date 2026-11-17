const BASE_URL = "https://image.novelai.net"

export type usageRemaining = {
    account_tier: number, 
    active: boolean,
    fixed_anlas: number,
    purchased_anlas: number,
    opus_percentage: number
}


export async function getAnlas(apiKey: string) {
  const res = await fetch(`${BASE_URL}/user/subscription`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (res.status === 401) throw new Error('Invalid API key');
  if (!res.ok) throw new Error(`NovelAI error ${res.status}`);

  const sub = await res.json();
  return {
    account_tier: sub.tier as number,
    active: sub.active as boolean,
    fixed_anlas: sub.trainingStepsLeft.fixedTrainingStepsLeft as number,
    purchased_anlas: sub.trainingStepsLeft.purchasedTrainingSteps as number,
    opus_percentage: sub.usage.percent as number
  };
}

export const SAMPLERS = [
  { value: 'k_euler', label: 'Euler' },
  { value: 'k_euler_ancestral', label: 'Euler Ancestral' },
  { value: 'k_dpmpp_2s_ancestral', label: 'DPM++ 2S Ancestral' },
  { value: 'k_dpmpp_2m_sde', label: 'DPM++ 2M SDE' },
  { value: 'k_dpmpp_2m', label: 'DPM++ 2M' },
  { value: 'k_dpmpp_sde', label: 'DPM++ SDE' },
];

export const MODELS = [
  { id: 'nai-diffusion-5-full', label: 'V5 Full', mediumId: 'nai-diffusion-5-full-medium' },
  { id: 'nai-diffusion-5-curated', label: 'V5 Curated' },
  { id: 'nai-diffusion-4-5-full', label: 'V4.5 Full' },
  { id: 'nai-diffusion-4-5-curated', label: 'V4.5 Curated' },
];

export function resolveModel(id: string, effort: 'high' | 'medium') {
  const model = MODELS.find((m) => m.id === id);
  return effort === 'medium' && model?.mediumId ? model.mediumId : id;
}

export const MEDIUM_PARAMS = { steps: 14, sampler: 'k_euler_ancestral', cfg_rescale: 0 };

export const MODES = {
  anime: { label: '🌸 Anime', prefix: '' },
  furry: { label: '🐾 Furry', prefix: 'fur dataset' },
};

export type GenerateInput = {
  model: string;
  prompt: string;
  undesired: string;
  characters: readonly { prompt: string; undesired: string }[];
  width: number;
  height: number;
  samples: number;
  steps: number;
  scale: number;
  seed: number;
  sampler: string;
  cfg_rescale: number;
};

export function buildRequest(g: GenerateInput) {
  const centers = [{ x: 0.5, y: 0.5 }];
  return {
    input: g.prompt,
    model: g.model,
    action: 'generate',
    parameters: {
      params_version: 4,
      width: g.width,
      height: g.height,
      scale: g.scale,
      sampler: g.sampler,
      steps: g.steps,
      n_samples: g.samples,
      seed: g.seed,
      cfg_rescale: g.cfg_rescale,
      noise_schedule: 'karras',
      dynamic_thresholding: false,
      controlnet_strength: 1,
      legacy: false,
      legacy_v3_extend: false,
      add_original_image: true,
      normalize_reference_strength_multiple: true,
      use_coords: false,
      legacy_uc: false,
      deliberate_euler_ancestral_bug: false,
      prefer_brownian: true,
      image_format: 'webp',
      characterPrompts: g.characters.map((c) => ({ prompt: c.prompt, uc: c.undesired, center: centers[0], enabled: true })),
      v4_prompt: {
        caption: { base_caption: g.prompt, char_captions: g.characters.map((c) => ({ char_caption: c.prompt, centers })) },
        use_coords: false,
        use_order: true,
      },
      v4_negative_prompt: {
        caption: { base_caption: g.undesired, char_captions: g.characters.map((c) => ({ char_caption: c.undesired, centers })) },
        legacy_uc: false,
      },
      negative_prompt: g.undesired,
    },
  };
}

export type GenerateRequest = ReturnType<typeof buildRequest>;

export type GeneratedImage = { image: string; index: number; seed: number };

type StreamEvent = {
  event_type: 'intermediate' | 'final' | 'error';
  samp_ix: number;
  image?: string;
  seed?: number;
  message?: string;
};

async function postGenerate(apiKey: string, path: string, accept: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: accept,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) throw new Error('Invalid API key');
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? `NovelAI error ${res.status}`);
  }
  return res;
}

export async function generateImages(
  apiKey: string,
  request: GenerateRequest,
  onpreview?: (image: string, index: number) => void,
): Promise<GeneratedImage[]> {
  if (!onpreview) {
    const res = await postGenerate(apiKey, '/ai/generate-image', 'application/json', request);
    const data: { images: GeneratedImage[] } = await res.json();
    return data.images;
  }

  const res = await postGenerate(apiKey, '/ai/generate-image-stream', 'text/event-stream', {
    ...request,
    parameters: { ...request.parameters, stream: 'sse' },
  });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  const images: GeneratedImage[] = [];
  let buffer = '';

  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    buffer += chunk.value;
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop()!;
    for (const block of blocks) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data) continue;
      const event: StreamEvent = JSON.parse(data);
      if (event.event_type === 'error') throw new Error(event.message ?? 'Generation failed');
      if (!event.image) continue;
      if (event.event_type === 'intermediate') onpreview(event.image, event.samp_ix);
      else images.push({ image: event.image, index: event.samp_ix, seed: event.seed ?? request.parameters.seed + event.samp_ix });
    }
  }
  return images;
}

export function anlasCost(o: {
  model: string;
  width: number;
  height: number;
  steps: number;
  samples: number;
  account: usageRemaining | null;
}) {
  const pixels = o.width * o.height;
  const isV5 = o.model.startsWith('nai-diffusion-5');
  const stepFactor = o.model === 'nai-diffusion-5-full-medium' ? 1 / 1.06521739 : 1;

  let perImage = Math.ceil(2.951823174884865e-6 * pixels + 5.753298233447344e-7 * pixels * o.steps * stepFactor);
  if (isV5) perImage *= 1.5;
  perImage = Math.max(Math.ceil(perImage), 2);
  if (perImage > 140) return null;

  const opusFree =
    pixels <= 1048576 &&
    o.steps <= 28 &&
    !!o.account &&
    o.account.account_tier >= 3 &&
    o.account.active &&
    !(isV5 && o.account.opus_percentage <= 0);

  return perImage * (o.samples - (opusFree ? 1 : 0));
}
