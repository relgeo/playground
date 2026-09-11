import { describe, expect, it } from 'vitest';
import {
  getNextWorkerRequestId,
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
});
