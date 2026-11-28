import { describe, expect, it } from 'vitest';
import { getEditorEscapeAction, getEditorIndentationChanges } from '../editor-keyboard';

function applyChanges(source: string, changes: ReturnType<typeof getEditorIndentationChanges>): string {
  return changes
    .slice()
    .sort((left, right) => right.from - left.from)
    .reduce((result, change) => `${result.slice(0, change.from)}${change.insert}${result.slice(change.to ?? change.from)}`, source);
}

describe('editor indentation contract', () => {
  it('adds two spaces to the current line without changing source content', () => {
    const source = 'objects:\npoint:\n  type: point';
    const changes = getEditorIndentationChanges(source, [{ anchor: 9, head: 9 }], 'indent');

    expect(applyChanges(source, changes)).toBe('objects:\n  point:\n  type: point');
    expect(changes).toEqual([{ from: 9, insert: '  ' }]);
  });

  it('indents and dedents every line in a multi-line selection once', () => {
    const source = 'one\n  two\n    three\nfour';
    const selection = [{ anchor: 0, head: source.indexOf('four') }];

    const indented = applyChanges(source, getEditorIndentationChanges(source, selection, 'indent'));
    expect(indented).toBe('  one\n    two\n      three\nfour');

    const dedented = applyChanges(indented, getEditorIndentationChanges(indented, selection, 'dedent'));
    expect(dedented).toBe(source);
  });

  it('dedents only the available indentation and never inserts a tab', () => {
    const source = '\tvalue\n value\nvalue';
    const selection = [{ anchor: 0, head: source.length }];

    expect(applyChanges(source, getEditorIndentationChanges(source, selection, 'dedent')))
      .toBe('value\nvalue\nvalue');
    expect(applyChanges(source, getEditorIndentationChanges(source, selection, 'indent')))
      .toBe('  \tvalue\n   value\n  value');
  });

  it('deduplicates lines touched by multiple selections', () => {
    const source = 'one\ntwo\nthree';
    const changes = getEditorIndentationChanges(source, [
      { anchor: 0, head: 5 },
      { anchor: 2, head: 8 },
    ], 'indent');

    expect(changes).toEqual([
      { from: 0, insert: '  ' },
      { from: 4, insert: '  ' },
    ]);
    expect(applyChanges(source, changes)).toBe('  one\n  two\nthree');
  });
});

describe('editor Escape contract', () => {
  it('closes autocomplete before requesting focus exit', () => {
    expect(getEditorEscapeAction(true)).toBe('close-autocomplete');
    expect(getEditorEscapeAction(false)).toBe('move-focus');
  });
});
