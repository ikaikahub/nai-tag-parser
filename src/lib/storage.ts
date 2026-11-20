import { getCurrentWebview } from '@tauri-apps/api/webview';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, readDir, remove } from '@tauri-apps/plugin-fs';
import { load } from '@tauri-apps/plugin-store';
import { db } from '$lib/db';

export type Usage = { files: number; bytes: number };

const GENERATION_TABLES = ['generation_image', 'images', 'generations'];

async function storeFiles() {
    const dir = await appDataDir();
    return (await readDir(dir)).filter((e) => e.isFile && e.name.endsWith('.json')).map((e) => e.name);
}

export function storageUsage() {
    return invoke<{ database: Usage; stores: Usage; images: Usage }>('storage_usage');
}

export function formatBytes(bytes: number) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(i ? 1 : 0)} ${units[i]}`;
}

export async function resetStores() {
    for (const file of await storeFiles()) {
        const store = await load(file);
        await store.clear();
        await store.save();
    }
}

export async function resetDatabase() {
    await db.close();
    await invoke('delete_database');
}

async function deleteImageFiles() {
    const dir = await join(await appDataDir(), 'images');
    if (await exists(dir)) await remove(dir, { recursive: true });
}

export async function deleteAllImages() {
    for (const table of GENERATION_TABLES) await db.execute(`DELETE FROM ${table}`);
    await deleteImageFiles();
}

export async function resetEverything() {
    await getCurrentWebview().clearAllBrowsingData().catch(() => {});
    await deleteImageFiles();
    await resetStores();
    await resetDatabase();
}
