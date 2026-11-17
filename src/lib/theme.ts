export const ANIMATION_MS = 75;

export const THEMES = ['system', 'bumblebee', 'dracula'] as const;
export type Theme = (typeof THEMES)[number];

export function applyTheme(theme: Theme) {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
}
