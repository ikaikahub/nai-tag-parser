import { SvelteSet } from 'svelte/reactivity';
import { countImages, type ImageSelection } from '$lib/db/images';
import { gallery, galleryQuery } from './history.svelte';

const allSelected = $state({ active: false, total: 0 });
const toggled = new SvelteSet<number>();
let anchor: number | null = null;

export const isSelected = (id: number) => allSelected.active !== toggled.has(id);

export const selectedCount = () => (allSelected.active ? allSelected.total - toggled.size : toggled.size);

function setSelected(id: number, selected: boolean) {
    if (selected !== allSelected.active) toggled.add(id);
    else toggled.delete(id);
}

export function toggle(id: number) {
    setSelected(id, !isSelected(id));
    anchor = id;
}

export function select(id: number) {
    setSelected(id, true);
    anchor = id;
}

export function selectRange(id: number) {
    const ids = gallery.feed.items.map((item) => item.id);
    const from = anchor === null ? -1 : ids.indexOf(anchor);
    const to = ids.indexOf(id);
    if (from === -1 || to === -1) return toggle(id);
    for (const rangeId of ids.slice(Math.min(from, to), Math.max(from, to) + 1)) setSelected(rangeId, true);
}

export async function selectAll() {
    allSelected.total = await countImages(galleryQuery());
    allSelected.active = true;
    toggled.clear();
}

export function clearSelection() {
    allSelected.active = false;
    toggled.clear();
    anchor = null;
}

export const currentSelection = (): ImageSelection => ({ all: allSelected.active, ids: [...toggled] });
