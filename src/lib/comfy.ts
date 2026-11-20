import { fetch } from '@tauri-apps/plugin-http';
import type { Resolution } from '$lib/presets';

export class ComfyError extends Error {}

type ComfyNode = { class_type: string; inputs: Record<string, unknown> };
export type ComfyWorkflow = Record<string, ComfyNode>;

const MODEL_INPUTS = ['unet_name', 'ckpt_name'] as const;

export type WorkflowNodes = {
  sampler: string;
  positive: string;
  negative: string;
  latent: string;
  loader: string;
  modelInput: (typeof MODEL_INPUTS)[number];
};

export type SeedControl = 'fixed' | 'increment' | 'decrement' | 'randomize';

export type ComfySettings = {
  model: string;
  seed: number;
  seedControl: SeedControl;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  denoise: number;
  size: Resolution;
  batchSize: number;
};

export type ComfyOptions = { models: string[]; samplers: string[]; schedulers: string[] };

export type ComfyImage = { bytes: Uint8Array; extension: string };

const POLL_MS = 500;

function linkedNode(workflow: ComfyWorkflow, id: string, input: string) {
  const value = workflow[id].inputs[input];
  if (Array.isArray(value) && typeof value[0] === 'string' && workflow[value[0]]) return value[0];
  throw new ComfyError(`Nothing is connected to the ${input} input of ${workflow[id].class_type}`);
}

function numberInput(node: ComfyNode, input: string) {
  const value = node.inputs[input];
  if (typeof value !== 'number') throw new ComfyError(`${node.class_type} ${input} needs to be a number in the workflow`);
  return value;
}

function stringInput(node: ComfyNode, input: string) {
  const value = node.inputs[input];
  if (typeof value !== 'string') throw new ComfyError(`${node.class_type} ${input} needs to be set in the workflow`);
  return value;
}

export function parseWorkflow(text: string): ComfyWorkflow {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ComfyError("That file isn't JSON");
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new ComfyError("That file isn't a ComfyUI workflow");
  if ('nodes' in parsed && 'links' in parsed) throw new ComfyError('Export the workflow from ComfyUI with Workflow → Export (API)');
  const isNode = (node: unknown) =>
    typeof node === 'object' && node !== null && 'class_type' in node && typeof node.class_type === 'string' && 'inputs' in node;
  if (!Object.values(parsed).every(isNode)) throw new ComfyError("That file isn't a ComfyUI API workflow");
  return parsed as ComfyWorkflow;
}

export function findNodes(workflow: ComfyWorkflow): WorkflowNodes {
  const samplers = Object.keys(workflow).filter((id) => workflow[id].class_type === 'KSampler');
  if (samplers.length !== 1) throw new ComfyError(`The workflow needs exactly one KSampler node, it has ${samplers.length}`);
  const [sampler] = samplers;

  const textNode = (input: 'positive' | 'negative') => {
    const id = linkedNode(workflow, sampler, input);
    if (typeof workflow[id].inputs.text !== 'string') {
      throw new ComfyError(`The KSampler ${input} input needs to come straight from a CLIP Text Encode node`);
    }
    return id;
  };

  const latent = linkedNode(workflow, sampler, 'latent_image');
  if (!['width', 'height', 'batch_size'].every((input) => typeof workflow[latent].inputs[input] === 'number')) {
    throw new ComfyError('The KSampler latent_image input needs to come from an Empty Latent Image node');
  }

  const visited = new Set<string>();
  let loader = linkedNode(workflow, sampler, 'model');
  let modelInput = MODEL_INPUTS.find((input) => typeof workflow[loader].inputs[input] === 'string');
  while (!modelInput) {
    if (visited.has(loader)) throw new ComfyError("Couldn't find the node that loads the model");
    visited.add(loader);
    loader = linkedNode(workflow, loader, 'model');
    modelInput = MODEL_INPUTS.find((input) => typeof workflow[loader].inputs[input] === 'string');
  }

  return { sampler, positive: textNode('positive'), negative: textNode('negative'), latent, loader, modelInput };
}

export function workflowSettings(workflow: ComfyWorkflow, nodes: WorkflowNodes): Omit<ComfySettings, 'seedControl'> {
  const sampler = workflow[nodes.sampler];
  const latent = workflow[nodes.latent];
  return {
    model: stringInput(workflow[nodes.loader], nodes.modelInput),
    seed: numberInput(sampler, 'seed'),
    steps: numberInput(sampler, 'steps'),
    cfg: numberInput(sampler, 'cfg'),
    sampler: stringInput(sampler, 'sampler_name'),
    scheduler: stringInput(sampler, 'scheduler'),
    denoise: numberInput(sampler, 'denoise'),
    size: { width: numberInput(latent, 'width'), height: numberInput(latent, 'height') },
    batchSize: numberInput(latent, 'batch_size'),
  };
}

export function workflowText(workflow: ComfyWorkflow, nodes: WorkflowNodes) {
  return {
    positive: stringInput(workflow[nodes.positive], 'text'),
    negative: stringInput(workflow[nodes.negative], 'text'),
  };
}

export function applySettings(
  workflow: ComfyWorkflow,
  nodes: WorkflowNodes,
  settings: ComfySettings,
  text: { positive: string; negative: string },
): ComfyWorkflow {
  const applied = structuredClone(workflow);
  Object.assign(applied[nodes.loader].inputs, { [nodes.modelInput]: settings.model });
  Object.assign(applied[nodes.sampler].inputs, {
    seed: settings.seed,
    steps: settings.steps,
    cfg: settings.cfg,
    sampler_name: settings.sampler,
    scheduler: settings.scheduler,
    denoise: settings.denoise,
  });
  Object.assign(applied[nodes.latent].inputs, {
    width: settings.size.width,
    height: settings.size.height,
    batch_size: settings.batchSize,
  });
  applied[nodes.positive].inputs.text = text.positive;
  applied[nodes.negative].inputs.text = text.negative;
  return applied;
}

async function comfyFetch(address: string, path: string, init: RequestInit = {}) {
  let base: URL;
  try {
    base = new URL(address.trim());
  } catch {
    throw new ComfyError(`"${address}" isn't a valid ComfyUI address`);
  }
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  try {
    return await fetch(new URL(path, base), { ...init, headers: { ...init.headers, Origin: base.origin } });
  } catch (e) {
    throw new ComfyError(`Couldn't reach ComfyUI at ${base.origin}`, { cause: e });
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new ComfyError(`ComfyUI sent an unexpected response (${response.status})`);
  }
}

type QueueError = {
  error?: { message: string };
  node_errors?: Record<string, { errors: { message: string; details: string }[] }>;
};

type HistoryImage = { filename: string; subfolder: string; type: string };

type Queue = { queue_running: [number, string][]; queue_pending: [number, string][] };

type HistoryEntry = {
  status: { status_str: string; completed: boolean; messages: [string, Record<string, unknown>][] };
  outputs: Record<string, { images?: HistoryImage[] }>;
};

function executionError(entry: HistoryEntry) {
  for (const [type, data] of entry.status.messages) {
    if (type === 'execution_error') return `${data.node_type}: ${data.exception_message}`;
    if (type === 'execution_interrupted') return 'The generation was interrupted in ComfyUI';
  }
  return 'ComfyUI failed to run the workflow';
}

async function getJson<T>(address: string, path: string) {
  const response = await comfyFetch(address, path);
  if (!response.ok) throw new ComfyError(`ComfyUI error ${response.status}`);
  return readJson<T>(response);
}

async function waitForResult(address: string, promptId: string) {
  for (;;) {
    const queue = await getJson<Queue>(address, 'queue');
    const entry = (await getJson<Record<string, HistoryEntry>>(address, `history/${promptId}`))[promptId];
    if (entry?.status.status_str === 'error') throw new ComfyError(executionError(entry));
    if (entry?.status.completed) return entry;
    const queued = [...queue.queue_running, ...queue.queue_pending].some(([, id]) => id === promptId);
    if (!entry && !queued) throw new ComfyError('ComfyUI dropped the generation, it may have restarted');
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

export async function generateComfyImages(address: string, workflow: ComfyWorkflow): Promise<ComfyImage[]> {
  const queued = await comfyFetch(address, 'prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: crypto.randomUUID() }),
  });
  if (!queued.ok) {
    const body = await readJson<QueueError>(queued);
    const nodeErrors = Object.entries(body.node_errors ?? {}).flatMap(([id, node]) =>
      node.errors.map((error) => `${workflow[id]?.class_type ?? id}: ${error.message}${error.details ? ` (${error.details})` : ''}`),
    );
    throw new ComfyError([body.error?.message ?? `ComfyUI error ${queued.status}`, ...nodeErrors].join('\n'));
  }

  const { prompt_id } = await readJson<{ prompt_id: string }>(queued);
  const entry = await waitForResult(address, prompt_id);

  const images = Object.values(entry.outputs).flatMap((output) => output.images ?? []);
  const saved = images.some((image) => image.type === 'output') ? images.filter((image) => image.type === 'output') : images;
  if (!saved.length) throw new ComfyError('The workflow finished without making any images');

  return Promise.all(
    saved.map(async (image) => {
      const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
      const response = await comfyFetch(address, `view?${query}`);
      if (!response.ok) throw new ComfyError(`Couldn't download ${image.filename} from ComfyUI (${response.status})`);
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        extension: image.filename.slice(image.filename.lastIndexOf('.') + 1),
      };
    }),
  );
}

type ObjectInfo = Record<string, { input: { required: Record<string, unknown[]> } }>;

function comboOptions(info: ObjectInfo, nodeClass: string, input: string): string[] {
  const spec = info[nodeClass]?.input.required[input];
  if (Array.isArray(spec?.[0])) return spec[0];
  const config = spec?.[1];
  if (spec?.[0] === 'COMBO' && typeof config === 'object' && config !== null && 'options' in config && Array.isArray(config.options)) {
    return config.options;
  }
  throw new ComfyError(`ComfyUI didn't list the options for ${nodeClass} ${input}`);
}


export async function getComfyOptions(address: string, workflow: ComfyWorkflow, nodes: WorkflowNodes): Promise<ComfyOptions> {
  const loaderClass = workflow[nodes.loader].class_type;
  const [samplerInfo, loaderInfo] = await Promise.all([
    getJson<ObjectInfo>(address, 'object_info/KSampler'),
    getJson<ObjectInfo>(address, `object_info/${encodeURIComponent(loaderClass)}`),
  ]);
  return {
    models: comboOptions(loaderInfo, loaderClass, nodes.modelInput),
    samplers: comboOptions(samplerInfo, 'KSampler', 'sampler_name'),
    schedulers: comboOptions(samplerInfo, 'KSampler', 'scheduler'),
  };
}
