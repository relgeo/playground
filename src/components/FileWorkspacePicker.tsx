import { useEffect, useRef, type ChangeEvent } from 'react';
import type { LocalDocument } from '../persistence';
import { EXAMPLES } from '../examples';

export type FileSourceValue = `local:${string}` | `example:${string}` | `shared:${string}`;

interface FileWorkspacePickerProps {
  activeSource: FileSourceValue;
  localDocuments: LocalDocument[];
  onSourceChange: (source: FileSourceValue) => void;
  onNewFile: () => void;
  onSaveAsFile: () => void;
  onRenameFile: () => void;
  onDeleteFile: () => void;
  onBackupWorkspace: () => void;
  onRestoreWorkspace: (file: File) => void | Promise<void>;
  onImportFile: (file: File) => void | Promise<void>;
  onDownloadFile: () => void;
}

export function FileWorkspacePicker({
  activeSource,
  localDocuments,
  onSourceChange,
  onNewFile,
  onSaveAsFile,
  onRenameFile,
  onDeleteFile,
  onBackupWorkspace,
  onRestoreWorkspace,
  onImportFile,
  onDownloadFile,
}: FileWorkspacePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDetailsElement>(null);
  const sortedDocuments = [...localDocuments].sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        if (actionsMenuRef.current) actionsMenuRef.current.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      const menu = actionsMenuRef.current;
      if (event.key !== 'Escape' || !menu?.open) return;
      menu.open = false;
      menu.querySelector('summary')?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const runFileAction = (action: () => void) => {
    if (actionsMenuRef.current) actionsMenuRef.current.open = false;
    action();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await onImportFile(file);
  };

  const handleRestoreChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await onRestoreWorkspace(file);
  };

  return (
    <div className="file-workspace-picker" role="group" aria-label="Source files">
      <select
        className="example-select file-source-select"
        aria-label="Choose source file"
        value={activeSource}
        onChange={(event) => onSourceChange(event.target.value as FileSourceValue)}
      >
        <optgroup label="My Files">
          {sortedDocuments.length === 0 ? (
            <option value="local:none" disabled>
              No local files yet
            </option>
          ) : (
            sortedDocuments.map((document) => (
              <option key={document.id} value={`local:${document.id}`}>
                {document.name}
              </option>
            ))
          )}
        </optgroup>
        {activeSource.startsWith('shared:') && (
          <optgroup label="Shared draft">
            <option value={activeSource}>Shared draft — save a copy to My Files</option>
          </optgroup>
        )}
        <optgroup label="Examples">
          {Object.entries(EXAMPLES).map(([key, example]) => (
            <option key={key} value={`example:${key}`}>
              {example.name}
            </option>
          ))}
        </optgroup>
      </select>

      <details className="file-actions-menu" ref={actionsMenuRef}>
        <summary aria-label="Open file actions">Menu</summary>
        <div className="file-actions-popup" role="group" aria-label="File actions">
          <button type="button" onClick={() => runFileAction(onNewFile)} title="Create a new local file" aria-keyshortcuts="Control+Alt+N Meta+Alt+N">
            New
          </button>
          <button type="button" onClick={() => runFileAction(() => fileInputRef.current?.click())} title="Import a YAML file" aria-keyshortcuts="Control+Alt+I Meta+Alt+I">
            Import
          </button>
          <button type="button" onClick={() => runFileAction(onSaveAsFile)} title="Save the current source as a local file" aria-keyshortcuts="Control+Alt+Shift+S Meta+Alt+Shift+S">
            Save as
          </button>
          {activeSource.startsWith('local:') && (
            <>
              <button type="button" onClick={() => runFileAction(onRenameFile)} title="Rename the active local file">
                Rename
              </button>
              <button type="button" onClick={() => runFileAction(onDeleteFile)} title="Delete the active local file">
                Delete
              </button>
            </>
          )}
          <button type="button" onClick={() => runFileAction(onDownloadFile)} title="Download the current source as YAML">
            Download
          </button>
          <button type="button" onClick={() => runFileAction(onBackupWorkspace)} title="Download all local files as a workspace backup">
            Backup
          </button>
          <button type="button" onClick={() => runFileAction(() => backupInputRef.current?.click())} title="Restore local files from a workspace backup">
            Restore
          </button>
        </div>
      </details>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept=".yaml,.yml,text/yaml,application/yaml"
        onChange={handleImportChange}
        aria-label="Import YAML file"
      />
      <input
        ref={backupInputRef}
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        onChange={handleRestoreChange}
        aria-label="Restore workspace backup"
      />
    </div>
  );
}
