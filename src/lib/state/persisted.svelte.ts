import { load } from '@tauri-apps/plugin-store';

export async function persisted<T extends object>(file: string, defaults: T): Promise<T> {
    const store = await load(file, { autoSave: 100 });
    const state = $state({ ...structuredClone(defaults), ...Object.fromEntries(await store.entries()) } as T);

    $effect.root(() => {
        $effect(() => {
            for (const [key, value] of Object.entries($state.snapshot(state) as object)) store.set(key, value);
        });
    });

    return state;
}
