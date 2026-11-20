import { listGenerations, type GenerationImage, type GenerationRow } from '$lib/db/generations';
import { deleteImageRows, listImages, selectedImages, type ImageFilter, type ImageRow, type ImageSelection } from '$lib/db/images';
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs';
import { imageUrl } from '$lib/images';
import type { Resolution } from '$lib/presets';
import { parseTags } from '$lib/tags';

const PAGE_SIZE = 30;

export type GalleryItem = ImageRow & { src: string };
export type HistoryImage = GenerationImage & { src: string; fileName: string };
export type HistoryEntry = Omit<GenerationRow, 'images'> & { images: HistoryImage[] };

const withSrc = async <T extends { relative_path: string }>(image: T) => ({ ...image, src: await imageUrl(image.relative_path) });

const fileName = (path: string) => path.split('/').pop() ?? path;

function pagedFeed<T>(fetchPage: (offset: number, limit: number) => Promise<T[]>) {
    const feed = $state({ items: [] as T[], loading: false, done: false });

    let version = 0;

    async function loadMore() {
        if (feed.loading || feed.done) return;
        const loadingVersion = version;
        feed.loading = true;
        try {
            const items = await fetchPage(feed.items.length, PAGE_SIZE);
            if (loadingVersion !== version) return;
            feed.items.push(...items);
            feed.done = items.length < PAGE_SIZE;
        } finally {
            if (loadingVersion === version) feed.loading = false;
        }
    }

    async function replaceItems(limit: number) {
        const reloadVersion = ++version;
        feed.loading = true;
        try {
            const items = await fetchPage(0, limit);
            if (reloadVersion !== version) return;
            feed.items = items;
            feed.done = items.length < limit;
        } finally {
            if (reloadVersion === version) feed.loading = false;
        }
    }

    const reload = () => replaceItems(PAGE_SIZE);
    const refresh = () => replaceItems(Math.max(feed.items.length, PAGE_SIZE));

    return { feed, loadMore, reload, refresh };
}

async function fetchHistory(offset: number, limit: number): Promise<HistoryEntry[]> {
    const rows = await listGenerations(offset, limit);
    return Promise.all(
        rows.map(async (row) => ({
            ...row,
            images: await Promise.all(
                row.images.map(async (image) => ({
                    ...image,
                    src: await imageUrl(image.relative_path),
                    fileName: fileName(image.relative_path),
                })),
            ),
        })),
    );
}

const historyFeed = pagedFeed(fetchHistory);
export const history = historyFeed.feed;
export const loadMoreHistory = historyFeed.loadMore;

export const historySelection = $state({
    entryId: null as number | null,
    enlargedImageId: null as number | null,
});

export async function reloadHistory() {
    historySelection.entryId = null;
    historySelection.enlargedImageId = null;
    await historyFeed.reload();
    historySelection.entryId = history.items[0]?.id ?? null;
}

export async function addNewestHistory() {
    const [entry] = await fetchHistory(0, 1);
    if (entry && entry.id !== history.items[0]?.id) history.items.unshift(entry);
}

const defaultGalleryFilter = () => ({
    favourites: false,
    include: '',
    exclude: '',
    size: null as Resolution | null,
});

export const galleryFilter = $state(defaultGalleryFilter());

export const resetGalleryFilter = () => Object.assign(galleryFilter, defaultGalleryFilter());

export function galleryQuery(): ImageFilter {
    return {
        favourites: galleryFilter.favourites,
        include: parseTags(galleryFilter.include),
        exclude: parseTags(galleryFilter.exclude),
        size: galleryFilter.size,
    };
}

export const gallery = pagedFeed(async (offset, limit) =>
    Promise.all((await listImages(galleryQuery(), offset, limit)).map(withSrc)),
);

export async function deleteImages(selection: ImageSelection) {
    const images = await selectedImages(selection, galleryQuery());
    await deleteImageRows(images.map((image) => image.id));
    for (const { relative_path } of images) {
        if (await exists(relative_path, { baseDir: BaseDirectory.AppData })) {
            await remove(relative_path, { baseDir: BaseDirectory.AppData });
        }
    }
    await Promise.all([gallery.reload(), reloadHistory()]);
    return images.length;
}
