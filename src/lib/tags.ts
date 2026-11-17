export function parseTags(text: string) {
    const tags = text
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean);
    return [...new Set(tags)];
}

export function formatTags(tags: string[]) {
    return tags.join(', ');
}

export function joinTags(...parts: string[]) {
    return parts
        .map((p) => p.trim().replace(/,$/, ''))
        .filter(Boolean)
        .join(', ');
}
