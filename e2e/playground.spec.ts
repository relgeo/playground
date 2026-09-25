import { expect, test, type Page } from '@playwright/test';

const runtimeDiagnosticSource = `version: 0.5

meta:
  name: RelGeo v0.5 Runtime Align Diagnostic

objects:
  first:
    type: point
    at: [0, 0]

  second:
    type: point
    at: [10, 10]

constraints:
  - align:
      target: first
      with: second
`;

async function openPlayground(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
  await expect(page.getByRole('status', { name: /^READY/ })).toBeVisible();
}

async function hasIndexedDbDocument(page: Page, documentId: string, contentFragment: string) {
  return page.evaluate(async ({ documentId: expectedId, contentFragment: expectedContent }) => {
    return new Promise<boolean>((resolve) => {
      const request = indexedDB.open('relgeo-playground', 1);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('workspaces', 'readonly');
        const getRequest = transaction.objectStore('workspaces').get('current');
        getRequest.onerror = () => {
          database.close();
          resolve(false);
        };
        getRequest.onsuccess = () => {
          const workspace = getRequest.result as {
            documents?: Array<{ id?: string; content?: string }>;
          } | undefined;
          database.close();
          resolve(Boolean(workspace?.documents?.some((document) =>
            document.id === expectedId && document.content?.includes(expectedContent),
          )));
        };
      };
    });
  }, { documentId, contentFragment });
}

test('resolves source, keeps preview visible, and exposes runtime diagnostics', async ({ page }) => {
  await openPlayground(page);

  const editor = page.getByRole('textbox', { name: 'RelGeo DSL source editor' });
  await editor.fill(runtimeDiagnosticSource);

  await expect(page.getByRole('status', { name: /^READY/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Model Preview canvas' })).toBeVisible();
  await expect(page.locator('.svg-inner-wrapper svg')).toBeVisible();

  await page.getByRole('tab', { name: 'Errors' }).click();
  await expect(page.getByRole('tab', { name: 'Errors' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Points are not aligned. Distance: 14.1421', { exact: true })).toBeVisible();
});

test('creates a local file and restores it after reload', async ({ page }) => {
  await openPlayground(page);

  const sourcePicker = page.getByRole('combobox', { name: 'Choose source file' });
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(sourcePicker).toHaveValue(/^local:/);

  const editor = page.getByRole('textbox', { name: 'RelGeo DSL source editor' });
  await editor.fill(runtimeDiagnosticSource);
  await expect(page.getByRole('status', { name: /^READY/ })).toBeVisible();

  const activeSource = await sourcePicker.inputValue();
  await expect.poll(
    () => hasIndexedDbDocument(
      page,
      activeSource.slice('local:'.length),
      'RelGeo v0.5 Runtime Align Diagnostic',
    ),
    { timeout: 5_000 },
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue(activeSource);
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' }))
    .toContainText('RelGeo v0.5 Runtime Align Diagnostic');

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('Renamed diagnostic');
  });
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await expect(page.locator('select[aria-label="Choose source file"] option', { hasText: 'Renamed diagnostic' }))
    .toHaveCount(1);

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete file', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue('example:architectural_plan');
  await expect(page.locator('select[aria-label="Choose source file"] option', { hasText: 'Renamed diagnostic' }))
    .toHaveCount(0);
});

test('starts fresh and ignores pre-adoption localStorage data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('relgeo_playground_workspace_v1', JSON.stringify({
      schemaVersion: 1,
      activeDocumentId: 'legacy-doc',
      documents: [{
        id: 'legacy-doc',
        name: 'Legacy proof',
        content: 'legacy: true',
        createdAt: 100,
        updatedAt: 100,
        source: 'imported',
      }],
    }));
    localStorage.setItem('relgeo_editor_draft', 'legacy draft');
  });

  await openPlayground(page);
  await expect(page.getByRole('combobox', { name: 'Choose source file' }))
    .toHaveValue('example:architectural_plan');
  await expect(page.locator('select[aria-label="Choose source file"] option', { hasText: 'Legacy proof' }))
    .toHaveCount(0);
});

test('imports a YAML file into My Files', async ({ page }) => {
  await openPlayground(page);

  await page.getByLabel('Import YAML file').setInputFiles({
    name: 'imported-plan.yaml',
    mimeType: 'application/yaml',
    buffer: Buffer.from(runtimeDiagnosticSource),
  });

  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue(/^local:/);
  await expect(page.locator('select[aria-label="Choose source file"] option', { hasText: 'imported-plan' }))
    .toHaveCount(1);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('imported-plan.yaml');
});

test('keeps a new file in memory when workspace storage fails', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeTransaction = IDBDatabase.prototype.transaction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    IDBDatabase.prototype.transaction = function transaction(this: IDBDatabase, ...args: any[]) {
      if (this.name === 'relgeo-playground') {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return nativeTransaction.apply(this, args as any);
    };
  });
  await openPlayground(page);

  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue(/^local:/);
  await expect(page.locator('.action-feedback')).toContainText('could not be saved locally');
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
});

test('keeps the editor available when an IndexedDB transaction aborts', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeTransaction = IDBDatabase.prototype.transaction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    IDBDatabase.prototype.transaction = function transaction(this: IDBDatabase, ...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = nativeTransaction.apply(this, args as any);
      if (this.name === 'relgeo-playground' && args[1] === 'readwrite') {
        window.setTimeout(() => {
          try {
            result.abort();
          } catch {
            // The transaction may already have completed.
          }
        }, 0);
      }
      return result;
    };
  });
  await openPlayground(page);

  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue(/^local:/);
  await expect(page.locator('.action-feedback')).toContainText('could not be saved locally');
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
});

test('keeps the editor available when the IndexedDB record is corrupt', async ({ page }) => {
  await page.goto('./favicon.svg');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('relgeo-playground', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('workspaces')) {
          request.result.createObjectStore('workspaces');
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('workspaces', 'readwrite');
        transaction.objectStore('workspaces').put({ schemaVersion: 999, invalid: true }, 'current');
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });

  await openPlayground(page);
  await expect(page.locator('.action-feedback'))
    .toContainText('Could not open browser file storage');
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
});

test('reports a blocked upgrade when another tab holds the old IndexedDB connection', async ({ page }) => {
  await openPlayground(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('relgeo-playground', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const scopedWindow = window as typeof window & { __relgeoBlockedConnection?: IDBDatabase };
        scopedWindow.__relgeoBlockedConnection = request.result;
        resolve();
      };
    });
  });

  const secondPage = await page.context().newPage();
  await secondPage.addInitScript(() => {
    const nativeOpen = IDBFactory.prototype.open;
    Object.defineProperty(indexedDB, 'open', {
      configurable: true,
      writable: true,
      value: function open(this: IDBFactory, name: string, version?: number) {
        if (name === 'relgeo-playground' && version === 1) {
          return nativeOpen.call(this, name, 2);
        }
        return version === undefined
          ? nativeOpen.call(this, name)
          : nativeOpen.call(this, name, version);
      },
    });
  });

  try {
    await openPlayground(secondPage);
    await expect(secondPage.locator('.action-feedback'))
      .toContainText('Could not open browser file storage');
  } finally {
    await page.evaluate(() => {
      const scopedWindow = window as typeof window & { __relgeoBlockedConnection?: IDBDatabase };
      scopedWindow.__relgeoBlockedConnection?.close();
    });
    await secondPage.close();
  }
});

test('restores a workspace backup and downloads a new backup', async ({ page }) => {
  await openPlayground(page);

  const backup = JSON.stringify({
    format: 'relgeo-playground-workspace',
    schemaVersion: 1,
    exportedAt: 100,
    workspace: {
      schemaVersion: 1,
      activeDocumentId: 'doc-backup-proof',
      documents: [{
        id: 'doc-backup-proof',
        name: 'Backup proof',
        content: 'version: 0.5\nmeta:\n  name: Backup restore proof\n',
        createdAt: 100,
        updatedAt: 100,
        source: 'imported',
      }],
    },
  });

  await page.getByLabel('Restore workspace backup').setInputFiles({
    name: 'relgeo-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Restore workspace', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue('local:doc-backup-proof');
  await expect(page.locator('select[aria-label="Choose source file"] option', { hasText: 'Backup proof' }))
    .toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' }))
    .toContainText('Backup restore proof');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^relgeo-playground-workspace-\d{4}-\d{2}-\d{2}\.json$/);
});

test('treats a shared hash draft as transient until it is saved locally', async ({ page }) => {
  await openPlayground(page);

  await page.getByRole('textbox', { name: 'RelGeo DSL source editor' }).fill(runtimeDiagnosticSource);
  await expect.poll(() => page.evaluate(() => {
    try {
      const normalized = window.location.hash.slice(1).replace(/-/g, '+').replace(/_/g, '/');
      const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
      return atob(`${normalized}${padding}`).includes('RelGeo v0.5 Runtime Align Diagnostic');
    } catch {
      return false;
    }
  }), { timeout: 5_000 }).toBe(true);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue('shared:hash');
  await expect(page.locator('select[aria-label="Choose source file"] option', { hasText: 'Shared draft' }))
    .toHaveCount(1);
  await page.getByRole('button', { name: 'Save as', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Choose source file' })).toHaveValue(/^local:/);
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' }))
    .toContainText('RelGeo v0.5 Runtime Align Diagnostic');
});

test('keeps file actions keyboard reachable and traps delete confirmation focus', async ({ page }) => {
  await openPlayground(page);

  const picker = page.getByRole('combobox', { name: 'Choose source file' });
  const actionNames = ['New', 'Import', 'Save as', 'Download', 'Backup', 'Restore'];
  await picker.focus();
  for (const name of actionNames) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
  }

  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
