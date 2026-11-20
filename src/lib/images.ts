import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, copyFile } from '@tauri-apps/plugin-fs';

const base = appDataDir();

export async function imageUrl(relativePath: string) {
    return convertFileSrc(await join(await base, relativePath));
}

export async function saveImage(relativePath: string, fileName: string) {
    const path = await save({ defaultPath: fileName });
    if (path) await copyFile(relativePath, path, { fromPathBaseDir: BaseDirectory.AppData });
}
