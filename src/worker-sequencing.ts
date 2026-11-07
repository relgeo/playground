import type { WorkerDocumentIdentity } from './types';

export function getNextWorkerRequestId(currentRequestId: number): number {
  return currentRequestId + 1;
}

export function isCurrentWorkerIdentity(
  response: Pick<WorkerDocumentIdentity, 'documentId' | 'version' | 'requestId'>,
  current: Pick<WorkerDocumentIdentity, 'documentId' | 'version' | 'requestId'>,
): boolean {
  return response.documentId === current.documentId
    && response.version === current.version
    && response.requestId === current.requestId;
}

export function isStaleWorkerIdentity(
  response: Pick<WorkerDocumentIdentity, 'documentId' | 'version' | 'requestId'>,
  current: Pick<WorkerDocumentIdentity, 'documentId' | 'version' | 'requestId'>,
): boolean {
  return !isCurrentWorkerIdentity(response, current);
}

export function shouldApplyWorkerResponse(
  response: number | Pick<WorkerDocumentIdentity, 'documentId' | 'version' | 'requestId'>,
  current: number | Pick<WorkerDocumentIdentity, 'documentId' | 'version' | 'requestId'>,
): boolean {
  if (typeof response === 'number' && typeof current === 'number') {
    return response === current;
  }
  if (typeof response === 'number' || typeof current === 'number') return false;
  return isCurrentWorkerIdentity(response, current);
}
