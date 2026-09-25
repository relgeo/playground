import { useRef, type ChangeEvent } from 'react';
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
  const sortedDocuments = [...localDocuments].sort((a, b) => b.updatedAt - a.updatedAt);

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

      <div className="file-workspace-actions" role="group" aria-label="File actions">
        <button type="button" onClick={onNewFile} title="Create a new local file">
          New
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} title="Import a YAML file">
          Import
        </button>
        <button type="button" onClick={onSaveAsFile} title="Save the current source as a local file">
          Save as
        </button>
        {activeSource.startsWith('local:') && (
          <>
            <button type="button" onClick={onRenameFile} title="Rename the active local file">
              Rename
            </button>
            <button type="button" onClick={onDeleteFile} title="Delete the active local file">
              Delete
            </button>
          </>
        )}
        <button type="button" onClick={onDownloadFile} title="Download the current source as YAML">
          Download
        </button>
        <button type="button" onClick={onBackupWorkspace} title="Download all local files as a workspace backup">
          Backup
        </button>
        <button type="button" onClick={() => backupInputRef.current?.click()} title="Restore local files from a workspace backup">
          Restore
        </button>
      </div>
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
