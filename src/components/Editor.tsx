import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { linter } from '@codemirror/lint';
import { autocompletion } from '@codemirror/autocomplete';
import { RelGeoLanguageService } from 'relgeo-language-service';
import { EditorView, hoverTooltip } from '@codemirror/view';
import React from 'react';

const langService = new RelGeoLanguageService();

const relgeoLinter = linter((view) => {
  const code = view.state.doc.toString();
  const diagnostics = langService.getDiagnostics(code);
  return diagnostics.map((d) => {
    try {
      const startLineNum = Math.max(1, Math.min(view.state.doc.lines, d.range.start.line + 1));
      const endLineNum = Math.max(1, Math.min(view.state.doc.lines, d.range.end.line + 1));
      const startLine = view.state.doc.line(startLineNum);
      const endLine = view.state.doc.line(endLineNum);
      const from = Math.max(startLine.from, Math.min(startLine.to, startLine.from + d.range.start.character));
      const to = Math.max(endLine.from, Math.min(endLine.to, endLine.from + d.range.end.character));
      return {
        from,
        to: from === to ? to + 1 : to, // Highlight at least 1 character
        severity: 'error' as const,
        message: d.message,
      };
    } catch {
      return {
        from: 0,
        to: code.length,
        severity: 'error' as const,
        message: d.message,
      };
    }
  });
});

const relgeoAutocompletion = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;
      if (word.from === word.to && !context.explicit) return null;

      const code = context.state.doc.toString();
      const line = context.state.doc.lineAt(context.pos);
      const completions = langService.getCompletions(code, {
        line: line.number - 1,
        character: context.pos - line.from,
      });

      return {
        from: word.from,
        options: completions.map((c) => ({
          label: c.label,
          type: 'keyword',
          detail: c.documentation as string,
        })),
      };
    },
  ],
});

const relgeoHover = hoverTooltip((view, pos) => {
  const code = view.state.doc.toString();
  const line = view.state.doc.lineAt(pos);
  const hover = langService.getHover(code, {
    line: line.number - 1,
    character: pos - line.from,
  });

  if (!hover) return null;

  return {
    pos,
    above: true,
    create() {
      const dom = document.createElement('div');
      dom.className = 'cm-hover-tooltip';
      const contents = hover.contents;
      dom.textContent = typeof contents === 'string'
        ? contents
        : Array.isArray(contents)
          ? contents.join('\n')
          : contents.value;
      return { dom };
    },
  };
});

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  editorRef?: React.RefObject<EditorView | null>;
}

export function Editor({ code, onChange, editorRef }: EditorProps) {
  return (
    <section className="editor-panel">
      <div className="panel-head compact">
        <div>
          <p className="section-kicker">RelGeo DSL Editor</p>
        </div>
      </div>
      <div className="editor-surface cm-wrapper">
        <CodeMirror
          ref={editorRef}
          value={code}
          height="100%"
          theme="none" // We use our own CSS for styling
          extensions={[yaml(), relgeoLinter, relgeoAutocompletion, EditorView.lineWrapping, relgeoHover]}
          onChange={(value) => onChange(value)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
          }}
          style={{
            fontSize: '0.8rem',
            fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            height: '100%',
            width: '100%',
          }}
        />
      </div>
    </section>
  );
}
