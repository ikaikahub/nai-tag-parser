import {
  findNodes,
  getComfyOptions,
  parseWorkflow,
  workflowSettings,
  workflowText,
  type ComfyOptions,
  type ComfySettings,
  type ComfyWorkflow,
} from '$lib/comfy';
import { prompt } from './generate.svelte';
import { persisted } from './persisted.svelte';
import { settings } from './settings.svelte';

export const COMFY_MAX_BATCH = 8;

const defaults: ComfySettings & { workflow: ComfyWorkflow | null } = {
  workflow: null,
  model: '',
  seed: 0,
  seedControl: 'randomize',
  steps: 20,
  cfg: 7,
  sampler: 'euler',
  scheduler: 'normal',
  denoise: 1,
  size: { width: 832, height: 1216 },
  batchSize: 1,
};

export const comfy = await persisted('comfy.json', defaults);

export const comfyOptions = $state<ComfyOptions & { error: string }>({ models: [], samplers: [], schedulers: [], error: '' });

export async function refreshComfyOptions() {
  if (!comfy.workflow) return;
  try {
    Object.assign(comfyOptions, await getComfyOptions(settings.comfyAddress, comfy.workflow, findNodes(comfy.workflow)), { error: '' });
  } catch (e) {
    comfyOptions.error = e instanceof Error ? e.message : String(e);
  }
}

export async function importWorkflow(text: string) {
  const workflow = parseWorkflow(text);
  const nodes = findNodes(workflow);
  const { positive, negative } = workflowText(workflow, nodes);
  Object.assign(comfy, { workflow, ...workflowSettings(workflow, nodes) });
  const undesired = negative.trim() && `/u\n${negative.trim()}`;
  prompt.text = [positive.trim(), undesired, prompt.text.trim()].filter(Boolean).join('\n\n');
  await refreshComfyOptions();
}

export const comfySnapshot = () => $state.snapshot(comfy);

export const comfyChoices = (list: string[], current: string) =>
  (list.includes(current) ? list : [current, ...list]).map((value) => ({ value, label: value }));

const SEED_LIMIT = 2 ** 50;

export function advanceComfySeed(used: number) {
  if (comfy.seedControl === 'increment') comfy.seed = used + 1;
  else if (comfy.seedControl === 'decrement') comfy.seed = Math.max(used - 1, 0);
  else if (comfy.seedControl === 'randomize') comfy.seed = Math.floor(Math.random() * SEED_LIMIT);
}
