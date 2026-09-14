export interface DiagnosticCodeInput {
  code?: string | null;
  path?: string | null;
}

export function getDiagnosticCode({ code, path }: DiagnosticCodeInput): string {
  return code || (path ? 'VALIDATION_FAILED' : 'COMPILE_ERROR');
}
