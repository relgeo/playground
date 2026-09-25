export const WORKSPACE_SCHEMA_VERSION = 1;
export const WORKSPACE_BACKUP_FORMAT = 'relgeo-playground-workspace';

export type LocalDocumentSource = 'new' | 'imported' | 'example-copy';

export interface LocalDocument {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  source: LocalDocumentSource;
  originExampleKey?: string;
}

export interface LocalWorkspace {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  activeDocumentId: string | null;
  documents: LocalDocument[];
}

export interface LocalWorkspaceBackup {
  format: typeof WORKSPACE_BACKUP_FORMAT;
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  exportedAt: number;
  workspace: LocalWorkspace;
}

export interface WorkspaceStorageStats {
  documentCount: number;
  serializedBytes: number;
  serializedKilobytes: number;
}

export interface ExampleSource {
  code: string;
}

type ExampleMap = Record<string, ExampleSource>;

const LOCAL_DOCUMENT_SOURCES: LocalDocumentSource[] = [
  'new',
  'imported',
  'example-copy',
];

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isLocalDocumentSource(value: unknown): value is LocalDocumentSource {
  return typeof value === 'string' && LOCAL_DOCUMENT_SOURCES.includes(value as LocalDocumentSource);
}

function createDocumentId(now: number): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `doc-${now.toString(36)}-${randomPart}`;
}

export function normalizeDocumentName(name: string, fallback = 'Untitled'): string {
  const withoutExtension = name.trim().replace(/\.(ya?ml)$/i, '');
  const safeName = withoutExtension
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');

  return safeName || fallback;
}

export function getUniqueDocumentName(
  requestedName: string,
  documents: LocalDocument[],
  excludeId?: string,
): string {
  const baseName = normalizeDocumentName(requestedName);
  const taken = new Set(
    documents
      .filter((document) => document.id !== excludeId)
      .map((document) => document.name.toLocaleLowerCase()),
  );

  if (!taken.has(baseName.toLocaleLowerCase())) return baseName;

  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${baseName} ${index}`;
    if (!taken.has(candidate.toLocaleLowerCase())) return candidate;
  }

  return `${baseName} ${Date.now()}`;
}

export function createLocalDocument(params: {
  name: string;
  content: string;
  source?: LocalDocumentSource;
  originExampleKey?: string;
  now?: number;
  id?: string;
}): LocalDocument {
  const now = params.now ?? Date.now();
  return {
    id: params.id ?? createDocumentId(now),
    name: normalizeDocumentName(params.name),
    content: params.content,
    createdAt: now,
    updatedAt: now,
    source: params.source ?? 'new',
    ...(params.originExampleKey ? { originExampleKey: params.originExampleKey } : {}),
  };
}

export function createEmptyWorkspace(): LocalWorkspace {
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    activeDocumentId: null,
    documents: [],
  };
}

function parseCurrentWorkspace(candidate: Record<string, unknown>): LocalWorkspace | null {
    if (!Array.isArray(candidate.documents)) return null;
    if (candidate.activeDocumentId !== null && typeof candidate.activeDocumentId !== 'string') {
      return null;
    }

    const documents: LocalDocument[] = [];
    const ids = new Set<string>();
    for (const value of candidate.documents) {
      if (!value || typeof value !== 'object') return null;
      const document = value as Record<string, unknown>;
      if (
        typeof document.id !== 'string' ||
        !document.id ||
        ids.has(document.id) ||
        typeof document.name !== 'string' ||
        typeof document.content !== 'string' ||
        !isFiniteTimestamp(document.createdAt) ||
        !isFiniteTimestamp(document.updatedAt) ||
        !isLocalDocumentSource(document.source)
      ) {
        return null;
      }
      if (hasOwn(document, 'originExampleKey') && typeof document.originExampleKey !== 'string') {
        return null;
      }

      ids.add(document.id);
      documents.push({
        id: document.id,
        name: normalizeDocumentName(document.name),
        content: document.content,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        source: document.source,
        ...(typeof document.originExampleKey === 'string'
          ? { originExampleKey: document.originExampleKey }
          : {}),
      });
    }

    const activeDocumentId = candidate.activeDocumentId;
    if (activeDocumentId !== null && !ids.has(activeDocumentId)) return null;

    return {
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      activeDocumentId,
      documents,
    };
}

export function parseLocalWorkspace(raw: string | null): LocalWorkspace | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as Record<string, unknown>;
    if (candidate.schemaVersion !== WORKSPACE_SCHEMA_VERSION) return null;
    return parseCurrentWorkspace(candidate);
  } catch {
    return null;
  }
}

export function serializeWorkspaceBackup(workspace: LocalWorkspace, now = Date.now()): string {
  const backup: LocalWorkspaceBackup = {
    format: WORKSPACE_BACKUP_FORMAT,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    exportedAt: now,
    workspace,
  };
  return JSON.stringify(backup, null, 2);
}

export function getWorkspaceStorageStats(workspace: LocalWorkspace): WorkspaceStorageStats {
  const serialized = JSON.stringify(workspace);
  const serializedBytes = new TextEncoder().encode(serialized).byteLength;
  return {
    documentCount: workspace.documents.length,
    serializedBytes,
    serializedKilobytes: Math.round((serializedBytes / 1024) * 100) / 100,
  };
}

export function parseWorkspaceBackup(raw: string | null): LocalWorkspace | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.format !== WORKSPACE_BACKUP_FORMAT
      || candidate.schemaVersion !== WORKSPACE_SCHEMA_VERSION
      || !isFiniteTimestamp(candidate.exportedAt)
      || typeof candidate.workspace !== 'object'
      || candidate.workspace === null
    ) {
      return null;
    }

    return parseLocalWorkspace(JSON.stringify(candidate.workspace));
  } catch {
    return null;
  }
}

export function findExampleKeyByCode(
  code: string,
  examples: ExampleMap
): string | null {
  for (const [key, example] of Object.entries(examples)) {
    if (example.code === code) return key;
  }
  return null;
}

export function resolveInitialPlaygroundState(params: {
  defaultExampleKey: string;
  examples: ExampleMap;
  hashCode?: string | null;
}): { code: string; selectedExample: string } {
  const { defaultExampleKey, examples, hashCode } = params;

  const fallbackExampleKey = examples[defaultExampleKey]
    ? defaultExampleKey
    : Object.keys(examples)[0];

  const preferredCode = hashCode || examples[fallbackExampleKey].code;
  const matchedExampleKey = findExampleKeyByCode(preferredCode, examples);

  if (matchedExampleKey) {
    return { code: preferredCode, selectedExample: matchedExampleKey };
  }

  return { code: preferredCode, selectedExample: fallbackExampleKey };
}
