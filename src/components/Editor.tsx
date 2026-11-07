import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { linter } from '@codemirror/lint';
import { autocompletion } from '@codemirror/autocomplete';
import {
  acceptCurrentDocumentAnalysis,
  RelGeoLanguageService,
} from '@relgeo/language-service';
import type {
  CompletionResult,
  DiagnosticsResult,
  DocumentAnalysisRequest,
  HoverResult,
} from '@relgeo/language-service';
import { EditorView, hoverTooltip } from '@codemirror/view';
import React from 'react';

const langService = new RelGeoLanguageService();
type EditorRequest = DocumentAnalysisRequest;
type ProtocolService = {
  analyzeDiagnostics?: (request: EditorRequest) => DiagnosticsResult;
  analyzeCompletion?: (request: EditorRequest, position: { line: number; character: number }) => CompletionResult;
  analyzeHover?: (request: EditorRequest, position: { line: number; character: number }) => HoverResult;
};
const protocolService = langService as unknown as RelGeoLanguageService & ProtocolService;
let lastEditorSource = '';
let editorDocumentVersion = 0;

function editorRequest(code: string) {
  if (code !== lastEditorSource) {
    editorDocumentVersion += 1;
    lastEditorSource = code;
  }
  return {
    documentId: 'playground-editor',
    version: editorDocumentVersion,
    requestId: `playground-editor-${editorDocumentVersion}`,
    code,
  };
}

function analyzeDiagnostics(code: string) {
  const request = editorRequest(code);
  const result = protocolService.analyzeDiagnostics?.(request);
  if (!result) return langService.getDiagnostics(code);
  return acceptCurrentDocumentAnalysis(result, request)?.diagnostics ?? [];
}

function analyzeCompletion(code: string, position: { line: number; character: number }) {
  const request = editorRequest(code);
  const result = protocolService.analyzeCompletion?.(request, position);
  if (!result) return langService.getCompletions(code, position);
  return acceptCurrentDocumentAnalysis(result, request)?.items ?? [];
}

function analyzeHover(code: string, position: { line: number; character: number }) {
  const request = editorRequest(code);
  const result = protocolService.analyzeHover?.(request, position);
  if (!result) return langService.getHover(code, position);
  return acceptCurrentDocumentAnalysis(result, request)?.hover ?? null;
}

const relgeoLinter = linter((view) => {
  const code = view.state.doc.toString();
  const diagnostics = analyzeDiagnostics(code);
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
      const completions = analyzeCompletion(code, {
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
  const hover = analyzeHover(code, {
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
  readOnly?: boolean;
}

export function Editor({ code, onChange, editorRef, readOnly = false }: EditorProps) {
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
          readOnly={readOnly}
          aria-label="RelGeo DSL source editor"
          aria-readonly={readOnly}
          height="100%"
          indentWithTab={false}
          theme="none" // We use our own CSS for styling
          extensions={[
            yaml(),
            relgeoLinter,
            relgeoAutocompletion,
            EditorView.lineWrapping,
            relgeoHover,
            EditorView.contentAttributes.of({
              'aria-label': 'RelGeo DSL source editor',
              'aria-multiline': 'true',
            }),
          ]}
          onChange={(value) => onChange(value)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
          }}
          className="editor-code-mirror"
        />
      </div>
    </section>
  );
}
