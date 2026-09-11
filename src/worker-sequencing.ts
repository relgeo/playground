export function getNextWorkerRequestId(currentRequestId: number): number {
  return currentRequestId + 1;
}

export function shouldApplyWorkerResponse(
  responseRequestId: number,
  latestRequestId: number
): boolean {
  return responseRequestId === latestRequestId;
}
