import { formatTags, joinTags, parseTags } from '$lib/tags';

// markers: // disables the rest of the block, /c starts a character block, /u starts its undesired part
const DISABLED = '//';
const CHARACTER = '/c';
const UNDESIRED = '/u';
// a lone / ends the block, so the rest of the line starts a new one
const BLOCK_END = '/';
const MARKER = /\/\/|\/c|\/u/g;
const MARKER_RUN = /^(?:\/\/|\/c|\/u)+/;

// NovelAI emphasis: { ] multiply by 1.05, } [ divide, 1.5:: sets a weight and :: resets it
const EMPHASIS = /(-?\d*\.?\d+::|::|[{}[\]])/;
const BRACKET_STEP = 1.05;

export type Segment = {
  readonly text: string;
  readonly kind: 'marker' | 'emphasis' | 'text';
  readonly disabled: boolean;
  readonly weight: number;
  // inside weight syntax, even one that works out to 1 like 1::tag::
  readonly emphasised: boolean;
  // which character this is, counting /c blocks only, so stray / or base blocks don't renumber them
  readonly characterNumber: number | null;
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
  let numericSet = false;
  let openBrackets = 0;
  let bracketWeight = 1;
  let characterCount = 0;

  const finishBlock = () => {
    if (block.positive.trim() || block.undesired.trim()) blocks.push(block);
    block = { character: false, positive: '', undesired: '' };
    inUndesired = disabled = false;
    numericWeight = bracketWeight = 1;
    numericSet = false;
    openBrackets = 0;
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
      const emphasised = kind === 'text' && (numericSet || openBrackets > 0);
      const characterNumber = block.character ? characterCount - 1 : null;
      const last = segments.at(-1);
      if (
        last &&
        last.kind === kind &&
        last.disabled === disabled &&
        last.weight === weight &&
        last.emphasised === emphasised &&
        last.characterNumber === characterNumber
      ) {
        segments[segments.length - 1] = { ...last, text: last.text + segmentText };
      } else {
        segments.push({ text: segmentText, kind, disabled, weight, emphasised, characterNumber });
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
        if (part === '{' || part === '[') openBrackets++;
        else if (part === '}' || part === ']') openBrackets = Math.max(openBrackets - 1, 0);
        else {
          numericWeight = part === '::' ? 1 : Number(part.slice(0, -2));
          numericSet = part !== '::';
          openBrackets = 0;
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
      } else {
        // markers can be written together like /c// as long as the word is only markers,
        // or ends in // with text after it like //tag, so words like /cat stay text
        const run = token.match(MARKER_RUN)?.[0] ?? '';
        if (!run || (run !== token && !run.endsWith(DISABLED))) {
          emitContent(token);
          continue;
        }
        for (const marker of run.match(MARKER)!) {
          // a /c after some content starts the next character, only disabled text runs on to a blank line or /
          const startsNextBlock = marker === CHARACTER && !disabled && (block.positive.trim() || block.undesired.trim());
          if (startsNextBlock) finishBlock();
          if (marker === CHARACTER && !block.character) {
            block.character = true;
            characterCount++;
          }
          else if (marker === UNDESIRED) inUndesired = true;
          else disabled = true;
          emit(marker, 'marker');
        }
        if (run !== token) emitContent(token.slice(run.length));
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
