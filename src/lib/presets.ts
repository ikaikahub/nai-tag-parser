export const QUALITY_TAGS = 'very aesthetic, amazing quality, no text';

export type UcPreset = { id: string; label: string; tags: string };

const HEAVY_V45_V5 =
    'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page';

const FURRY_FOCUS =
    '{worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic';

const HUMAN_FOCUS = `${HEAVY_V45_V5}, @_@, mismatched pupils, glowing eyes, bad anatomy`;

const V5: UcPreset[] = [
    { id: 'heavy', label: 'Heavy', tags: HEAVY_V45_V5 },
    {
        id: 'light',
        label: 'Light',
        tags: 'lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::',
    },
    { id: 'furryFocus', label: 'Furry Focus', tags: FURRY_FOCUS },
    { id: 'humanFocus', label: 'Human Focus', tags: HUMAN_FOCUS },
    { id: 'none', label: 'None', tags: '' },
];

const V45_FULL: UcPreset[] = [
    { id: 'heavy', label: 'Heavy', tags: HEAVY_V45_V5 },
    {
        id: 'light',
        label: 'Light',
        tags: 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page',
    },
    { id: 'furryFocus', label: 'Furry Focus', tags: FURRY_FOCUS },
    { id: 'humanFocus', label: 'Human Focus', tags: HUMAN_FOCUS },
    { id: 'none', label: 'None', tags: '' },
];

const V45_CURATED: UcPreset[] = [
    {
        id: 'heavy',
        label: 'Heavy',
        tags: 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page',
    },
    {
        id: 'light',
        label: 'Light',
        tags: 'blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page',
    },
    {
        id: 'humanFocus',
        label: 'Human Focus',
        tags: 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page',
    },
    { id: 'none', label: 'None', tags: '' },
];

export const UC_PRESETS: Record<string, UcPreset[]> = {
    'nai-diffusion-5-full': V5,
    'nai-diffusion-5-curated': V5,
    'nai-diffusion-4-5-full': V45_FULL,
    'nai-diffusion-4-5-curated': V45_CURATED,
};

export type Orientation = 'portrait' | 'landscape' | 'square';

export type Resolution = {
    width: number;
    height: number;
}

export const RESOLUTIONS: Record<string, Partial<Record<Orientation, Resolution>>> = {
    Small: {
        portrait: { width: 512, height: 768 },
        landscape: { width: 768, height: 512 },
        square: { width: 640, height: 640 },
    },
    Normal: {
        portrait: { width: 832, height: 1216 },
        landscape: { width: 1216, height: 832 },
        square: { width: 1024, height: 1024 },
    },
    Large: {
        portrait: { width: 1024, height: 1536 },
        landscape: { width: 1536, height: 1024 },
        square: { width: 1472, height: 1472 },
    },
    Wallpaper: {
        portrait: { width: 1088, height: 1920 },
        landscape: { width: 1920, height: 1088 },
    },
};

export function maxSamples(width: number, height: number) {
    return width * height <= 409600 ? 6 : 4;
}
