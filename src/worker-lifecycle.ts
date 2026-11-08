import type { WorkerDocumentIdentity } from './types';

export interface WorkerLike<Request, Response> {
  onmessage: ((event: MessageEvent<Response>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: Request): void;
  terminate(): void;
}

export type WorkerFailureKind = 'cancelled' | 'superseded' | 'timeout' | 'worker-error' | 'message-error' | 'post-error' | 'disposed';

export interface WorkerLifecycleFailure {
  kind: WorkerFailureKind;
  message: string;
  identity?: WorkerDocumentIdentity;
  error?: unknown;
}

export interface WorkerLifecycleOptions<Request extends WorkerDocumentIdentity, Response extends WorkerDocumentIdentity> {
  createWorker: () => WorkerLike<Request, Response>;
  onResponse?: (response: Response, request: Request) => void;
  onFailure?: (failure: WorkerLifecycleFailure) => void;
  timeoutMs?: number;
}

interface PendingRequest<Request extends WorkerDocumentIdentity, Response extends WorkerDocumentIdentity> {
  request: Request;
  resolve: (response: Response) => void;
  reject: (failure: WorkerLifecycleFailure) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Owns the browser worker boundary. A worker is replaceable after an error or
 * timeout, and only the exact current document/request identity can reach the
 * consumer callback. Terminating a worker is the cancellation primitive because
 * the language-service operation is synchronous inside the worker.
 */
export class WorkerLifecycle<Request extends WorkerDocumentIdentity, Response extends WorkerDocumentIdentity> {
  private worker: WorkerLike<Request, Response> | null = null;
  private currentIdentity: WorkerDocumentIdentity | null = null;
  private pending = new Map<number, PendingRequest<Request, Response>>();
  private disposed = false;

  constructor(private readonly options: WorkerLifecycleOptions<Request, Response>) {}

  dispatch(request: Request): Promise<Response> {
    if (this.disposed) {
      const failure = this.failure('disposed', 'Worker lifecycle has been disposed.', request);
      this.options.onFailure?.(failure);
      return Promise.reject(failure);
    }

    // A newer request supersedes the previous one. Its eventual response is
    // still ignored by identity, while the rejection prevents a dangling
    // promise from keeping consumer state alive.
    let supersededRequest = false;
    for (const [requestId, pending] of this.pending) {
      if (requestId !== request.requestId) {
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.reject(this.failure('superseded', 'A newer worker request superseded this request.', pending.request));
        supersededRequest = true;
      }
    }

    // The worker executes analysis synchronously. Termination is therefore the
    // only reliable way to cancel CPU work that is already in progress.
    if (supersededRequest) this.replaceWorker();

    this.currentIdentity = request;
    let worker: WorkerLike<Request, Response>;
    try {
      worker = this.ensureWorker();
    } catch (error: unknown) {
      const failure = this.failure('worker-error', 'Worker could not be started.', request, error);
      this.options.onFailure?.(failure);
      return Promise.reject(failure);
    }

    return new Promise<Response>((resolve, reject) => {
      const timeoutMs = this.options.timeoutMs ?? 15_000;
      const timer = setTimeout(() => {
        if (!this.pending.has(request.requestId)) return;
        const failure = this.failure('timeout', `Worker request timed out after ${timeoutMs}ms.`, request);
        this.pending.delete(request.requestId);
        reject(failure);
        this.options.onFailure?.(failure);
        this.replaceWorker();
      }, timeoutMs);
      this.pending.set(request.requestId, { request, resolve, reject, timer });

      try {
        worker.postMessage(request);
      } catch (error: unknown) {
        clearTimeout(timer);
        this.pending.delete(request.requestId);
        const failure = this.failure('post-error', 'Worker rejected the request.', request, error);
        reject(failure);
        this.options.onFailure?.(failure);
        this.replaceWorker();
      }
    });
  }

  /** Cancel the active request and terminate the worker doing synchronous work. */
  cancelCurrent(): boolean {
    const current = this.currentIdentity;
    if (!current) return false;
    const pending = this.pending.get(current.requestId);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pending.delete(current.requestId);
    pending.reject(this.failure('cancelled', 'Worker request was cancelled.', pending.request));
    this.replaceWorker();
    return true;
  }

  /** Dispose the worker and all handlers; no callbacks can escape afterwards. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(this.failure('disposed', 'Worker lifecycle has been disposed.', pending.request));
    }
    this.pending.clear();
    this.currentIdentity = null;
    this.replaceWorker();
  }

  private ensureWorker(): WorkerLike<Request, Response> {
    if (this.worker) return this.worker;
    const worker = this.options.createWorker();
    worker.onmessage = (event) => this.handleMessage(event.data);
    worker.onerror = (event) => this.handleWorkerFailure('worker-error', event.message || 'Worker failed.', event.error);
    worker.onmessageerror = (event) => this.handleWorkerFailure('message-error', 'Worker response could not be deserialized.', event);
    this.worker = worker;
    return worker;
  }

  private handleMessage(response: Response): void {
    if (!response || typeof response !== 'object'
      || typeof response.requestId !== 'number'
      || typeof response.version !== 'number'
      || typeof response.documentId !== 'string') {
      this.handleWorkerFailure('message-error', 'Worker returned a malformed response.', response);
      return;
    }
    const pending = this.pending.get(response.requestId);
    if (!pending) return;

    if (!this.currentIdentity || !this.sameIdentity(response, this.currentIdentity)) {
      clearTimeout(pending.timer);
      this.pending.delete(response.requestId);
      pending.reject(this.failure('superseded', 'A stale worker response was discarded.', pending.request));
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(response.requestId);
    pending.resolve(response);
    this.options.onResponse?.(response, pending.request);
  }

  private handleWorkerFailure(kind: 'worker-error' | 'message-error', message: string, error?: unknown): void {
    const current = this.currentIdentity;
    const pending = current ? this.pending.get(current.requestId) : undefined;
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(current.requestId);
      const failure = this.failure(kind, message, pending.request, error);
      pending.reject(failure);
      this.options.onFailure?.(failure);
    }
    this.replaceWorker();
  }

  private replaceWorker(): void {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
  }

  private sameIdentity(left: WorkerDocumentIdentity, right: WorkerDocumentIdentity): boolean {
    return left.documentId === right.documentId
      && left.version === right.version
      && left.requestId === right.requestId;
  }

  private failure(kind: WorkerFailureKind, message: string, identity?: WorkerDocumentIdentity, error?: unknown): WorkerLifecycleFailure {
    return { kind, message, identity, error };
  }
}
