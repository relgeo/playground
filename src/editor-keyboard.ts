export type EditorIndentDirection = 'indent' | 'dedent';

export interface EditorSelectionRange {
  anchor: number;
  head: number;
}

export interface EditorIndentationChange {
  from: number;
  to?: number;
  insert: string;
}

export type EditorEscapeAction = 'close-autocomplete' | 'move-focus';

export function getEditorEscapeAction(completionIsActive: boolean): EditorEscapeAction {
  return completionIsActive ? 'close-autocomplete' : 'move-focus';
}

const EDITOR_INDENT = '  ';

function getLineStarts(source: string): number[] {
  const starts = [0];
  for (let index = source.indexOf('\n'); index >= 0; index = source.indexOf('\n', index + 1)) {
    starts.push(index + 1);
  }
  return starts;
}

function getLineNumber(lineStarts: readonly number[], position: number): number {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= position) low = middle + 1;
    else high = middle - 1;
  }
  return Math.max(0, high);
}

/**
 * Returns non-overlapping changes for the lines touched by the selections.
 * A selection ending at the start of a line does not include that empty
 * endpoint line, matching CodeMirror's normal block indentation behavior.
 */
export function getEditorIndentationChanges(
  source: string,
  selections: readonly EditorSelectionRange[],
  direction: EditorIndentDirection,
): EditorIndentationChange[] {
  const lineStarts = getLineStarts(source);
  const lines = new Set<number>();

  for (const selection of selections) {
    const from = Math.min(selection.anchor, selection.head);
    const to = Math.max(selection.anchor, selection.head);
    const end = from === to ? to : Math.max(from, to - 1);
    const firstLine = getLineNumber(lineStarts, from);
    const lastLine = getLineNumber(lineStarts, end);
    for (let line = firstLine; line <= lastLine; line += 1) lines.add(line);
  }

  return [...lines].sort((left, right) => left - right).flatMap((lineNumber) => {
    const from = lineStarts[lineNumber];
    const lineEnd = lineStarts[lineNumber + 1] === undefined
      ? source.length
      : lineStarts[lineNumber + 1] - 1;

    if (direction === 'indent') {
      return [{ from, insert: EDITOR_INDENT }];
    }

    const leadingWhitespace = source.slice(from, lineEnd).match(/^[ \t]*/)?.[0] ?? '';
    if (!leadingWhitespace) return [];
    const removeCount = leadingWhitespace.startsWith('\t')
      ? 1
      : Math.min(EDITOR_INDENT.length, leadingWhitespace.length);
    return [{ from, to: from + removeCount, insert: '' }];
  });
}
