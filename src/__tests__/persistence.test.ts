import { describe, expect, it } from 'vitest';
import {
  createLocalDocument,
  getUniqueDocumentName,
  findExampleKeyByCode,
  getWorkspaceStorageStats,
  normalizeDocumentName,
  parseLocalWorkspace,
  parseWorkspaceBackup,
  resolveInitialPlaygroundState,
  serializeWorkspaceBackup,
} from '../persistence';
import {
  IndexedDbWorkspaceRepository,
  WorkspacePersistenceError,
} from '../indexeddb-persistence';

const EXAMPLES = {
  fundamentals: { code: 'fundamentals-code' },
  technical_sheets: { code: 'technical-sheets-code' },
  architectural_plan: { code: 'architectural-plan-code' },
};

function createFakeRequest<T>(result: T): IDBRequest<T> {
  const request = {
    result,
    error: null,
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
  } as unknown as IDBRequest<T>;
  queueMicrotask(() => request.onsuccess?.({} as Event));
  return request;
}

function createFakeRepositoryFactory(options: {
  initialValue?: unknown;
  failFirstWrite?: boolean;
} = {}): IDBFactory {
  let storedValue = options.initialValue;
  let failNextWrite = options.failFirstWrite ?? false;
  const store = {
    get: () => createFakeRequest(storedValue),
    put: (value: unknown) => {
      storedValue = value;
      return createFakeRequest(undefined);
    },
  };
  const database = {
    objectStoreNames: { contains: () => true },
    transaction: (_storeName: string, mode?: IDBTransactionMode) => {
      const transaction = {
        error: mode === 'readwrite' && failNextWrite
          ? new DOMException('Transaction aborted.', 'AbortError')
          : null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        objectStore: () => store,
      } as unknown as IDBTransaction;
      if (mode === 'readwrite' && failNextWrite) {
        failNextWrite = false;
        queueMicrotask(() => transaction.onabort?.({} as Event));
      } else {
        queueMicrotask(() => transaction.oncomplete?.({} as Event));
      }
      return transaction;
    },
    close: () => undefined,
    onversionchange: null,
  } as unknown as IDBDatabase;

  return {
    open: () => createFakeRequest(database) as unknown as IDBOpenDBRequest,
  } as unknown as IDBFactory;
}

describe('playground persistence helpers', () => {
  it('normalizes display names without changing source content', () => {
    expect(normalizeDocumentName('  room/plan.yaml  ')).toBe('room-plan');
    expect(normalizeDocumentName('   ')).toBe('Untitled');
  });

  it('creates unique names without mutating existing documents', () => {
    const documents = [
      createLocalDocument({ id: 'a', name: 'Plan', content: '', now: 1 }),
      createLocalDocument({ id: 'b', name: 'Plan 2', content: '', now: 2 }),
    ];

    expect(getUniqueDocumentName('Plan', documents)).toBe('Plan 3');
    expect(getUniqueDocumentName('Plan', documents, 'a')).toBe('Plan');
    expect(documents[0].name).toBe('Plan');
  });

  it('round-trips a versioned workspace and rejects malformed data', () => {
    const workspace = {
      schemaVersion: 1 as const,
      activeDocumentId: 'doc-1',
      documents: [
        createLocalDocument({
          id: 'doc-1',
          name: 'Plan',
          content: 'scene: {}',
          source: 'imported',
          now: 10,
        }),
      ],
    };
    expect(parseLocalWorkspace(JSON.stringify(workspace))).toEqual(workspace);
    expect(parseLocalWorkspace('{"schemaVersion":1,"documents":[]}')).toBeNull();
    expect(parseLocalWorkspace('{not-json')).toBeNull();
  });

  it('round-trips a versioned workspace backup and rejects invalid envelopes', () => {
    const workspace = {
      schemaVersion: 1 as const,
      activeDocumentId: 'doc-1',
      documents: [createLocalDocument({
        id: 'doc-1',
        name: 'Backup plan',
        content: 'version: 0.5',
        now: 10,
      })],
    };

    const backup = serializeWorkspaceBackup(workspace, 20);
    expect(parseWorkspaceBackup(backup)).toEqual(workspace);
    expect(parseWorkspaceBackup(backup.replace('relgeo-playground-workspace', 'unknown'))).toBeNull();
    expect(parseWorkspaceBackup('{"format":"relgeo-playground-workspace"}')).toBeNull();
  });

  it('reports serialized workspace size for storage decisions', () => {
    const workspace = {
      schemaVersion: 1 as const,
      activeDocumentId: null,
      documents: [],
    };
    const stats = getWorkspaceStorageStats(workspace);
    expect(stats.documentCount).toBe(0);
    expect(stats.serializedBytes).toBeGreaterThan(0);
    expect(stats.serializedKilobytes).toBeGreaterThan(0);
  });

  it('reports IndexedDB unavailable without pretending the workspace was saved', async () => {
    const repository = new IndexedDbWorkspaceRepository(null);

    await expect(repository.load()).rejects.toMatchObject<Partial<WorkspacePersistenceError>>({
      code: 'unavailable',
    });
  });

  it('reports a blocked IndexedDB open so callers can offer recovery guidance', async () => {
    const factory = {
      open: () => {
        const request = {} as IDBOpenDBRequest;
        queueMicrotask(() => request.onblocked?.(new Event('blocked')));
        return request;
      },
    } as unknown as IDBFactory;
    const repository = new IndexedDbWorkspaceRepository(factory);

    await expect(repository.load()).rejects.toMatchObject<Partial<WorkspacePersistenceError>>({
      code: 'blocked',
    });
  });

  it('round-trips through IndexedDB and serializes concurrent writes', async () => {
    let storedValue: unknown = undefined;
    const store = {
      get: () => createFakeRequest(storedValue),
      put: (value: unknown) => {
        storedValue = value;
        return createFakeRequest(undefined);
      },
    };
    const database = {
      objectStoreNames: { contains: () => true },
      transaction: () => {
        const transaction = {
          error: null,
          oncomplete: null as ((event: Event) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          onabort: null as ((event: Event) => void) | null,
          objectStore: () => store,
        } as unknown as IDBTransaction;
        queueMicrotask(() => transaction.oncomplete?.({} as Event));
        return transaction;
      },
      close: () => undefined,
      onversionchange: null,
    } as unknown as IDBDatabase;
    const factory = {
      open: () => {
        const request = createFakeRequest(database);
        return request as unknown as IDBOpenDBRequest;
      },
    } as unknown as IDBFactory;
    const repository = new IndexedDbWorkspaceRepository(factory);
    const firstWorkspace = {
      schemaVersion: 1 as const,
      activeDocumentId: null,
      documents: [],
    };
    const secondDocument = createLocalDocument({
      id: 'queued-document',
      name: 'Queued document',
      content: 'version: 0.5',
      now: 20,
    });
    const secondWorkspace = {
      schemaVersion: 1 as const,
      activeDocumentId: secondDocument.id,
      documents: [secondDocument],
    };

    await Promise.all([
      repository.save(firstWorkspace),
      repository.save(secondWorkspace),
    ]);

    await expect(repository.load()).resolves.toEqual(secondWorkspace);
  });

  it('retries after an interrupted write and rejects malformed records', async () => {
    const workspace = {
      schemaVersion: 1 as const,
      activeDocumentId: null,
      documents: [],
    };
    const retryRepository = new IndexedDbWorkspaceRepository(
      createFakeRepositoryFactory({ failFirstWrite: true }),
    );

    await expect(retryRepository.save(workspace)).rejects.toMatchObject<Partial<WorkspacePersistenceError>>({
      code: 'transaction',
    });
    await expect(retryRepository.save(workspace)).resolves.toBeUndefined();

    const malformedRepository = new IndexedDbWorkspaceRepository(
      createFakeRepositoryFactory({ initialValue: { schemaVersion: 999 } }),
    );
    await expect(malformedRepository.load()).rejects.toMatchObject<Partial<WorkspacePersistenceError>>({
      code: 'corrupt',
    });
  });

  it('finds exact example key by code', () => {
    expect(findExampleKeyByCode('technical-sheets-code', EXAMPLES)).toBe(
      'technical_sheets'
    );
    expect(findExampleKeyByCode('custom-code', EXAMPLES)).toBeNull();
  });

  it('prefers URL hash code and aligns selected example when code matches a bundled example', () => {
    const state = resolveInitialPlaygroundState({
      defaultExampleKey: 'architectural_plan',
      examples: EXAMPLES,
      hashCode: 'technical-sheets-code',
    });

    expect(state.code).toBe('technical-sheets-code');
    expect(state.selectedExample).toBe('technical_sheets');
  });

  it('falls back to default example when no persisted state exists', () => {
    const state = resolveInitialPlaygroundState({
      defaultExampleKey: 'architectural_plan',
      examples: EXAMPLES,
    });

    expect(state.code).toBe('architectural-plan-code');
    expect(state.selectedExample).toBe('architectural_plan');
  });
});
