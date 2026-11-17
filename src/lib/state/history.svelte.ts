import type { GenerateRequest } from '$lib/napi';

const PAGE_SIZE = 30;
const STORE = 'generations';

export type StoredGeneration = {
  id?: number;
  createdAt: number;
  width: number;
  height: number;
  promptText: string;
  request: GenerateRequest;
  images: { blob: Blob; seed: number }[];
};

export type HistoryImage = { id: number; src: string; seed: number; fileName: string };
export type HistoryEntry = { id: number; width: number; height: number; images: HistoryImage[] };

const database = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('nai-ats', 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// image ids only need to be unique across the feed, so they are derived from the generation id
const toEntry = (generation: StoredGeneration & { id: number }): HistoryEntry => ({
  id: generation.id,
  width: generation.width,
  height: generation.height,
  images: generation.images.map((image, index) => ({
    id: generation.id * 100 + index,
    src: URL.createObjectURL(image.blob),
    seed: image.seed,
    fileName: `nai-${generation.createdAt}-${index + 1}.${image.blob.type.split('/')[1].replace('jpeg', 'jpg')}`,
  })),
});

// newest first
async function readGenerations(offset: number, limit: number) {
  const store = (await database).transaction(STORE).objectStore(STORE);
  return new Promise<HistoryEntry[]>((resolve, reject) => {
    const entries: HistoryEntry[] = [];
    let skipped = false;
    const cursorRequest = store.openCursor(null, 'prev');
    cursorRequest.onerror = () => reject(cursorRequest.error);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor && offset && !skipped) {
        skipped = true;
        cursor.advance(offset);
        return;
      }
      if (!cursor || entries.length >= limit) return resolve(entries);
      entries.push(toEntry(cursor.value));
      cursor.continue();
    };
  });
}

export async function saveGeneration(generation: StoredGeneration) {
  const store = (await database).transaction(STORE, 'readwrite').objectStore(STORE);
  await new Promise((resolve, reject) => {
    const request = store.add(generation);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

export const history = $state({ items: [] as HistoryEntry[], loading: false, done: false });

export const historySelection = $state({
  entryId: null as number | null,
  enlargedImageId: null as number | null,
});

export async function loadMoreHistory() {
  if (history.loading || history.done) return;
  history.loading = true;
  try {
    const items = await readGenerations(history.items.length, PAGE_SIZE);
    history.items.push(...items);
    history.done = items.length < PAGE_SIZE;
  } finally {
    history.loading = false;
  }
}

export async function addNewestHistory() {
  const [entry] = await readGenerations(0, 1);
  if (entry && entry.id !== history.items[0]?.id) history.items.unshift(entry);
}
