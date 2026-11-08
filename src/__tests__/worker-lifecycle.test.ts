import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerLifecycle, type WorkerLike } from '../worker-lifecycle';
import type { WorkerRequest, WorkerResponse } from '../types';

function request(requestId: number, version = requestId): WorkerRequest {
  return { documentId: 'local:test', version, requestId, code: `version: 0.5\n# ${requestId}` };
}

function response(input: WorkerRequest): WorkerResponse {
  return {
    documentId: input.documentId,
    version: input.version,
    requestId: input.requestId,
    type: 'ERROR',
    readiness: 'invalid',
    recoveryState: 'invalid',
    analysis: {} as WorkerResponse['analysis'],
    error: `error-${input.requestId}`,
  };
}

class FakeWorker implements WorkerLike<WorkerRequest, WorkerResponse> {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminated = false;
  posted: WorkerRequest[] = [];

  postMessage(message: WorkerRequest): void {
    if (this.terminated) throw new Error('terminated');
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(responseValue: WorkerResponse): void {
    this.onmessage?.({ data: responseValue } as MessageEvent<WorkerResponse>);
  }

  fail(message = 'boom'): void {
    this.onerror?.({ message, error: new Error(message) } as ErrorEvent);
  }
}

describe('worker lifecycle boundary', () => {
  beforeEach(() => vi.useRealTimers());

  it('suppresses out-of-order results and leaves only the newest request observable', async () => {
    const workers: FakeWorker[] = [];
    const applied: number[] = [];
    const lifecycle = new WorkerLifecycle<WorkerRequest, WorkerResponse>({
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
      onResponse: (result) => applied.push(result.requestId),
      timeoutMs: 1000,
    });

    const first = lifecycle.dispatch(request(1));
    const second = lifecycle.dispatch(request(2));
    workers[0].emit(response(request(1)));
    workers[1].emit(response(request(2)));

    await expect(first).rejects.toMatchObject({ kind: 'superseded' });
    await expect(second).resolves.toMatchObject({ requestId: 2 });
    expect(applied).toEqual([2]);
    expect(workers[0].terminated).toBe(true);
    lifecycle.dispose();
  });

  it('cancels synchronous work by terminating the worker and allows a fresh request after cancellation', async () => {
    const workers: FakeWorker[] = [];
    const lifecycle = new WorkerLifecycle<WorkerRequest, WorkerResponse>({
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
      timeoutMs: 1000,
    });

    const pending = lifecycle.dispatch(request(1));
    expect(lifecycle.cancelCurrent()).toBe(true);
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
    expect(workers[0].terminated).toBe(true);

    const next = lifecycle.dispatch(request(2));
    expect(workers).toHaveLength(2);
    workers[1].emit(response(request(2)));
    await expect(next).resolves.toMatchObject({ requestId: 2 });
    lifecycle.dispose();
  });

  it('recovers after a worker error and does not hide the error behind a hanging request', async () => {
    const workers: FakeWorker[] = [];
    const failures: string[] = [];
    const lifecycle = new WorkerLifecycle<WorkerRequest, WorkerResponse>({
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
      onFailure: (failure) => failures.push(failure.kind),
      timeoutMs: 1000,
    });

    const failed = lifecycle.dispatch(request(1));
    workers[0].fail();
    await expect(failed).rejects.toMatchObject({ kind: 'worker-error' });
    expect(workers[0].terminated).toBe(true);

    const recovered = lifecycle.dispatch(request(2));
    workers[1].emit(response(request(2)));
    await expect(recovered).resolves.toMatchObject({ requestId: 2 });
    expect(failures).toEqual(['worker-error']);
    lifecycle.dispose();
  });

  it('contains a malformed worker response and recreates the boundary', async () => {
    const workers: FakeWorker[] = [];
    const failures: string[] = [];
    const lifecycle = new WorkerLifecycle<WorkerRequest, WorkerResponse>({
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
      onFailure: (failure) => failures.push(failure.kind),
      timeoutMs: 1000,
    });

    const failed = lifecycle.dispatch(request(1));
    workers[0].emit({ malformed: true } as unknown as WorkerResponse);
    await expect(failed).rejects.toMatchObject({ kind: 'message-error' });
    expect(workers[0].terminated).toBe(true);
    expect(failures).toEqual(['message-error']);
    lifecycle.dispose();
  });

  it('times out, terminates, and recreates the worker deterministically', async () => {
    vi.useFakeTimers();
    const workers: FakeWorker[] = [];
    const failures: string[] = [];
    const lifecycle = new WorkerLifecycle<WorkerRequest, WorkerResponse>({
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
      onFailure: (failure) => failures.push(failure.kind),
      timeoutMs: 25,
    });

    const timedOut = lifecycle.dispatch(request(1));
    vi.advanceTimersByTime(25);
    await expect(timedOut).rejects.toMatchObject({ kind: 'timeout' });
    expect(workers[0].terminated).toBe(true);
    expect(failures).toEqual(['timeout']);

    const next = lifecycle.dispatch(request(2));
    workers[1].emit(response(request(2)));
    await expect(next).resolves.toMatchObject({ requestId: 2 });
    lifecycle.dispose();
  });

  it('cleans up handlers and rejects pending work on dispose', async () => {
    const worker = new FakeWorker();
    const lifecycle = new WorkerLifecycle<WorkerRequest, WorkerResponse>({
      createWorker: () => worker,
    });
    const pending = lifecycle.dispatch(request(1));
    lifecycle.dispose();

    await expect(pending).rejects.toMatchObject({ kind: 'disposed' });
    expect(worker.terminated).toBe(true);
    expect(worker.onmessage).toBeNull();
    expect(lifecycle.cancelCurrent()).toBe(false);
  });
});
