import { db } from '.';
import type { Resolution } from '$lib/presets';

export type ImageRow = {
    id: number;
    generation_id: number;
    relative_path: string;
    seed: number;
    favourite: 0 | 1;
    width: number;
    height: number;
};

export type ImageFilter = {
    favourites: boolean;
    include: string[];
    exclude: string[];
    size: Resolution | null;
};

const FILTERED_IMAGES = `
    FROM images i
    JOIN generation_image gi ON gi.image_id = i.id
    JOIN generations g ON g.id = gi.generation_id
    WHERE ($1 = 0 OR i.favourite = 1)
      AND json_array_length($2) = (
          SELECT COUNT(*) FROM generation_tag gt JOIN tags t ON t.id = gt.tag_id
          WHERE gt.generation_id = g.id AND t.value IN (SELECT value FROM json_each($2)))
      AND NOT EXISTS (
          SELECT 1 FROM generation_tag gt JOIN tags t ON t.id = gt.tag_id
          WHERE gt.generation_id = g.id AND t.value IN (SELECT value FROM json_each($3)))
      AND ($4 IS NULL OR (g.width = $4 AND g.height = $5))`;

const filterParams = (filter: ImageFilter) => [
    filter.favourites ? 1 : 0,
    JSON.stringify(filter.include),
    JSON.stringify(filter.exclude),
    filter.size?.width ?? null,
    filter.size?.height ?? null,
];

export function listImages(filter: ImageFilter, offset: number, limit: number) {
    return db.select<ImageRow[]>(
        `SELECT i.id, gi.generation_id, i.relative_path, i.seed, i.favourite, g.width, g.height
         ${FILTERED_IMAGES}
         ORDER BY i.id DESC
         LIMIT $6 OFFSET $7`,
        [...filterParams(filter), limit, offset],
    );
}

export async function countImages(filter: ImageFilter) {
    const [row] = await db.select<{ count: number }[]>(`SELECT COUNT(*) AS count ${FILTERED_IMAGES}`, filterParams(filter));
    return row.count;
}

export type ImageSelection = { all: boolean; ids: number[] };

export async function selectedImages(selection: ImageSelection, filter: ImageFilter) {
    if (!selection.all) {
        return db.select<Pick<ImageRow, 'id' | 'relative_path'>[]>(
            'SELECT id, relative_path FROM images WHERE id IN (SELECT value FROM json_each($1))',
            [JSON.stringify(selection.ids)],
        );
    }
    return db.select<Pick<ImageRow, 'id' | 'relative_path'>[]>(
        `SELECT i.id, i.relative_path ${FILTERED_IMAGES} AND i.id NOT IN (SELECT value FROM json_each($6))`,
        [...filterParams(filter), JSON.stringify(selection.ids)],
    );
}

export async function deleteImageRows(ids: number[]) {
    await db.execute('DELETE FROM generation_image WHERE image_id IN (SELECT value FROM json_each($1))', [JSON.stringify(ids)]);
    await db.execute('DELETE FROM generations WHERE id NOT IN (SELECT generation_id FROM generation_image)');
}

export async function setFavourite(id: number, favourite: boolean) {
    await db.execute('UPDATE images SET favourite = $1 WHERE id = $2', [favourite ? 1 : 0, id]);
}

export async function toggleFavourite(image: Pick<ImageRow, 'id' | 'favourite'>) {
    const next = image.favourite ? 0 : 1;
    await setFavourite(image.id, next === 1);
    image.favourite = next;
}
