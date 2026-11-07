import { describe, expect, it } from 'vitest';
import {
  getNextWorkerRequestId,
  isCurrentWorkerIdentity,
  isStaleWorkerIdentity,
  shouldApplyWorkerResponse,
} from '../worker-sequencing';

describe('worker sequencing helpers', () => {
  it('increments request ids monotonically', () => {
    expect(getNextWorkerRequestId(0)).toBe(1);
    expect(getNextWorkerRequestId(7)).toBe(8);
  });

  it('applies only the latest worker response', () => {
    expect(shouldApplyWorkerResponse(3, 3)).toBe(true);
    expect(shouldApplyWorkerResponse(2, 3)).toBe(false);
    expect(shouldApplyWorkerResponse(4, 3)).toBe(false);
  });

  it('requires document, version, and request identity for worker responses', () => {
    const current = { documentId: 'local:active', version: 3, requestId: 8 };

    expect(isCurrentWorkerIdentity(current, current)).toBe(true);
    expect(isStaleWorkerIdentity({ ...current, documentId: 'local:other' }, current)).toBe(true);
    expect(isStaleWorkerIdentity({ ...current, version: 2 }, current)).toBe(true);
    expect(isStaleWorkerIdentity({ ...current, requestId: 7 }, current)).toBe(true);
    expect(shouldApplyWorkerResponse(current, current)).toBe(true);
    expect(shouldApplyWorkerResponse({ ...current, documentId: 'local:other' }, current)).toBe(false);
  });
});
