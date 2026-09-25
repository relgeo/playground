import {
  parseLocalWorkspace,
  type LocalWorkspace,
} from './persistence';

export const WORKSPACE_DATABASE_NAME = 'relgeo-playground';
export const WORKSPACE_DATABASE_VERSION = 1;
export const WORKSPACE_OBJECT_STORE = 'workspaces';
export const WORKSPACE_RECORD_KEY = 'current';

export type WorkspacePersistenceErrorCode =
  | 'unavailable'
  | 'blocked'
  | 'quota'
  | 'corrupt'
  | 'transaction'
  | 'unknown';

export class WorkspacePersistenceError extends Error {
  readonly code: WorkspacePersistenceErrorCode;

  constructor(code: WorkspacePersistenceErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'WorkspacePersistenceError';
    this.code = code;
  }
}

export interface WorkspaceRepository {
  load(): Promise<LocalWorkspace | null>;
  save(workspace: LocalWorkspace): Promise<void>;
}

function getIndexedDbFactory(): IDBFactory | null {
  return typeof indexedDB === 'undefined' ? null : indexedDB;
}

function mapPersistenceError(error: unknown, fallback: WorkspacePersistenceErrorCode): WorkspacePersistenceError {
  if (error instanceof WorkspacePersistenceError) return error;

  const name = error instanceof DOMException ? error.name : '';
  if (name === 'QuotaExceededError') {
    return new WorkspacePersistenceError('quota', 'Browser storage quota was exceeded.', error);
  }
  if (name === 'AbortError' || name === 'InvalidStateError' || name === 'TransactionInactiveError') {
    return new WorkspacePersistenceError('transaction', 'The browser storage transaction was interrupted.', error);
  }
  return new WorkspacePersistenceError(fallback, 'Browser storage is unavailable.', error);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Transaction aborted.', 'AbortError'));
  });
}

function openWorkspaceDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = factory.open(WORKSPACE_DATABASE_NAME, WORKSPACE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(WORKSPACE_OBJECT_STORE)) {
        database.createObjectStore(WORKSPACE_OBJECT_STORE);
      }
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      const database = request.result;
      database.onversionchange = () => database.close();
      settled = true;
      resolve(database);
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(mapPersistenceError(request.error, 'unknown'));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new WorkspacePersistenceError(
        'blocked',
        'Browser storage is blocked by another open tab. Close older playground tabs and retry.',
      ));
    };
  });
}

function normalizeStoredWorkspace(value: unknown): LocalWorkspace | null {
  if (value === undefined || value === null) return null;
  const parsed = parseLocalWorkspace(typeof value === 'string' ? value : JSON.stringify(value));
  if (!parsed) {
    throw new WorkspacePersistenceError('corrupt', 'The saved workspace record is invalid.');
  }
  return parsed;
}

async function readStoredWorkspace(database: IDBDatabase): Promise<LocalWorkspace | null> {
  const transaction = database.transaction(WORKSPACE_OBJECT_STORE, 'readonly');
  const complete = transactionComplete(transaction);
  const request = transaction.objectStore(WORKSPACE_OBJECT_STORE).get(WORKSPACE_RECORD_KEY);
  const value = await requestResult(request);
  await complete;
  return normalizeStoredWorkspace(value);
}

export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
  private readonly factory: IDBFactory | null;
  private databasePromise: Promise<IDBDatabase> | null = null;
  private operationQueue: Promise<unknown> = Promise.resolve();

  constructor(factory: IDBFactory | null = getIndexedDbFactory()) {
    this.factory = factory;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.factory) {
      return Promise.reject(new WorkspacePersistenceError(
        'unavailable',
        'IndexedDB is not available in this browser context.',
      ));
    }
    this.databasePromise ??= openWorkspaceDatabase(this.factory).catch((error) => {
      this.databasePromise = null;
      throw mapPersistenceError(error, 'unknown');
    });
    return this.databasePromise;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.operationQueue.then(operation, operation);
    this.operationQueue = next.then(() => undefined, () => undefined);
    return next;
  }

  load(): Promise<LocalWorkspace | null> {
    return this.enqueue(async () => {
      const database = await this.open();
      try {
        return await readStoredWorkspace(database);
      } catch (error) {
        throw mapPersistenceError(error, 'transaction');
      }
    });
  }

  save(workspace: LocalWorkspace): Promise<void> {
    return this.enqueue(async () => {
      const normalized = normalizeStoredWorkspace(workspace);
      if (!normalized) {
        throw new WorkspacePersistenceError('corrupt', 'Cannot save an empty workspace record.');
      }
      const database = await this.open();
      try {
        const transaction = database.transaction(WORKSPACE_OBJECT_STORE, 'readwrite');
        const complete = transactionComplete(transaction);
        transaction.objectStore(WORKSPACE_OBJECT_STORE).put(normalized, WORKSPACE_RECORD_KEY);
        await complete;
        const verified = await readStoredWorkspace(database);
        if (!verified) {
          throw new WorkspacePersistenceError('corrupt', 'IndexedDB did not return the saved workspace.');
        }
      } catch (error) {
        throw mapPersistenceError(error, 'transaction');
      }
    });
  }
}

export function createWorkspaceRepository(): WorkspaceRepository {
  return new IndexedDbWorkspaceRepository();
}
