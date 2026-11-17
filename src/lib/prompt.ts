import { formatTags, joinTags, parseTags } from '$lib/tags';

// markers are separate words: // disables the rest of the block, /c makes it a character, /u starts its undesired part
const DISABLED = '//';
const CHARACTER = '/c';
const UNDESIRED = '/u';
// a lone / ends the block, so the rest of the line starts a new one
const BLOCK_END = '/';

// NovelAI emphasis: { ] multiply by 1.05, } [ divide, 1.5:: sets a weight and :: resets it
const EMPHASIS = /(-?\d*\.?\d+::|::|[{}[\]])/;
const BRACKET_STEP = 1.05;

export type Segment = {
  readonly text: string;
  readonly kind: 'marker' | 'emphasis' | 'text';
  readonly disabled: boolean;
  readonly weight: number;
  // counts every block shown, including fully disabled ones
  readonly blockNumber: number;
};

export type Block = {
  readonly character: boolean;
  readonly positive: string;
  readonly undesired: string;
};

export type BuiltPrompt = {
  readonly base: string;
  readonly undesired: string;
  readonly characters: readonly { prompt: string; undesired: string }[];
  readonly blocks: readonly string[];
};

// blocks are runs of non-blank lines, which a lone / can also split
export function parsePrompt(text: string): { lines: Segment[][]; blocks: Block[] } {
  const lines: Segment[][] = [];
  const blocks: Block[] = [];
  let block = { character: false, positive: '', undesired: '' };
  let inUndesired = false;
  let disabled = false;
  let numericWeight = 1;
  let bracketWeight = 1;
  let blockNumber = 0;
  let blockShown = false;

  const finishBlock = () => {
    if (blockShown) blockNumber++;
    blockShown = false;
    if (block.positive.trim() || block.undesired.trim()) blocks.push(block);
    block = { character: false, positive: '', undesired: '' };
    inUndesired = disabled = false;
    numericWeight = bracketWeight = 1;
  };

  const addContent = (content: string) => {
    if (disabled) return;
    if (inUndesired) block.undesired += content;
    else block.positive += content;
  };

  for (const line of text.split('\n')) {
    const segments: Segment[] = [];
    lines.push(segments);
    if (!line.trim()) {
      finishBlock();
      continue;
    }

    const emit = (segmentText: string, kind: Segment['kind']) => {
      const weight = kind === 'text' ? numericWeight * bracketWeight : 1;
      const last = segments.at(-1);
      blockShown = true;
      if (
        last &&
        last.kind === kind &&
        last.disabled === disabled &&
        last.weight === weight &&
        last.blockNumber === blockNumber
      ) {
        segments[segments.length - 1] = { ...last, text: last.text + segmentText };
      } else {
        segments.push({ text: segmentText, kind, disabled, weight, blockNumber });
      }
    };

    const emitContent = (content: string) => {
      addContent(content);
      for (const part of content.split(EMPHASIS)) {
        if (!part) continue;
        if (!EMPHASIS.test(part)) {
          emit(part, 'text');
          continue;
        }
        if (part === '{' || part === ']') bracketWeight *= BRACKET_STEP;
        else if (part === '}' || part === '[') bracketWeight /= BRACKET_STEP;
        else {
          numericWeight = part === '::' ? 1 : Number(part.slice(0, -2));
          bracketWeight = 1;
        }
        emit(part, 'emphasis');
      }
    };

    for (const token of line.split(/(\s+)/)) {
      if (!token) continue;
      if (!token.trim()) {
        emit(token, 'text');
        addContent(token);
      } else if (token === BLOCK_END) {
        emit(token, 'marker');
        finishBlock();
      } else if ([CHARACTER, UNDESIRED].includes(token)) {
        if (token === CHARACTER) block.character = true;
        else inUndesired = true;
        emit(token, 'marker');
      } else if (token.startsWith(DISABLED)) {
        disabled = true;
        emit(DISABLED, 'marker');
        if (token.length > DISABLED.length) emitContent(token.slice(DISABLED.length));
      } else {
        emitContent(token);
      }
    }
    addContent('\n');
  }
  finishBlock();
  return { lines, blocks };
}

export function buildPrompt(text: string): BuiltPrompt {
  const { blocks } = parsePrompt(text);
  const base = blocks.filter((block) => !block.character);
  const tags = (texts: string[]) => formatTags(parseTags(joinTags(...texts.map((part) => formatTags(parseTags(part))))));
  return {
    base: tags(base.map((block) => block.positive)),
    undesired: tags(base.map((block) => block.undesired)),
    characters: blocks
      .filter((block) => block.character)
      .map((block) => ({ prompt: tags([block.positive]), undesired: tags([block.undesired]) }))
      .filter((character) => character.prompt || character.undesired),
    blocks: blocks.map((block) => block.positive.trim()).filter(Boolean),
  };
}

export function insertChunk(text: string, position: number, chunk: string) {
  const before = text.slice(0, position).trimEnd();
  const after = text.slice(position).trimStart();
  return [before, chunk.trim(), after].filter(Boolean).join('\n\n');
}
