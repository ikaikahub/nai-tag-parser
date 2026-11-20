import { db } from '.';

export async function ensureTags(values: string[]) {
    if (!values.length) return [];
    const params = values.map((_, i) => `$${i + 1}`).join(', ');
    await db.execute(
        `INSERT INTO tags (value) VALUES ${values.map((_, i) => `($${i + 1})`).join(', ')}
         ON CONFLICT(value) DO NOTHING`,
        values,
    );
    const rows = await db.select<{ id: number; value: string }[]>(
        `SELECT id, value FROM tags WHERE value IN (${params})`,
        values,
    );
    const ids = new Map(rows.map((r) => [r.value, r.id]));
    return values.map((v) => ids.get(v)!);
}
