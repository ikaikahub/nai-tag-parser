import { db } from '.';
import type { ComfyWorkflow } from '$lib/comfy';
import type { GenerateRequest } from '$lib/napi';
import type { ImageRow } from './images';
import { ensureTags } from './tags';

export type GenerationImage = Pick<ImageRow, 'id' | 'relative_path' | 'seed' | 'favourite'>;
export type GenerationRow = { id: number; width: number; height: number; images: GenerationImage[] };

export async function listGenerations(offset: number, limit: number): Promise<GenerationRow[]> {
    const rows = await db.select<(Omit<GenerationRow, 'images'> & { images: string })[]>(
        `SELECT g.id, g.width, g.height, json_group_array(json_object(
                    'id', i.id, 'relative_path', i.relative_path, 'seed', i.seed, 'favourite', i.favourite)) AS images
         FROM generations g
         JOIN generation_image gi ON gi.generation_id = g.id
         JOIN images i ON i.id = gi.image_id
         GROUP BY g.id
         ORDER BY g.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
    );
    return rows.map((row) => ({
        ...row,
        images: (JSON.parse(row.images) as GenerationImage[]).sort((a, b) => a.id - b.id),
    }));
}

export async function saveGeneration(
    record: GenerationRecord,
    promptText: string,
    size: { width: number; height: number },
    tags: string[],
    images: { path: string; seed: number }[],
) {
    const generation = await db.execute(
        'INSERT INTO generations (parameters_json, prompt_text, width, height) VALUES ($1, $2, $3, $4)',
        [JSON.stringify(record), promptText, size.width, size.height],
    );
    const generationId = generation.lastInsertId!;

    const tagIds = await ensureTags(tags);
    if (tagIds.length) {
        const rows = tagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await db.execute(`INSERT INTO generation_tag (generation_id, tag_id) VALUES ${rows}`, [generationId, ...tagIds]);
    }

    for (const image of images) {
        const row = await db.execute('INSERT INTO images (relative_path, seed) VALUES ($1, $2)', [image.path, image.seed]);
        await db.execute('INSERT INTO generation_image (generation_id, image_id) VALUES ($1, $2)', [
            generationId,
            row.lastInsertId!,
        ]);
    }

    return generationId;
}

export type ComfyRecord = {
    backend: 'comfyui';
    prompt: string;
    negative: string;
    workflow: ComfyWorkflow;
};

export type GenerationRecord = GenerateRequest | ComfyRecord;

export const isComfyRecord = (record: GenerationRecord): record is ComfyRecord => 'backend' in record;

export type GenerationDetails = {
    createdAt: string;
    promptText: string;
    record: GenerationRecord;
};

export async function getGenerationDetails(id: number): Promise<GenerationDetails> {
    const [row] = await db.select<{ created_at: string; prompt_text: string; parameters_json: string }[]>(
        'SELECT created_at, prompt_text, parameters_json FROM generations WHERE id = $1',
        [id],
    );
    return { createdAt: row.created_at, promptText: row.prompt_text, record: JSON.parse(row.parameters_json) };
}
