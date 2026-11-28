export interface ParameterBounds {
  min?: number;
  max?: number;
}

export interface ParameterMetadata extends ParameterBounds {
  defaultValue: number;
  step: number;
  type?: string;
}

export interface ParameterDraftValidation {
  valid: boolean;
  value?: number;
  message?: string;
}

const NUMERIC_PARAMETER_TYPES = new Set(['number', 'length', 'angle', 'percent']);
const NUMERIC_DRAFT_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const NUMERIC_METADATA_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:[a-z%]+)?$/i;

export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed || !NUMERIC_DRAFT_PATTERN.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseNumericMetadataValue(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed || !NUMERIC_METADATA_PATTERN.test(trimmed)) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isNumericParameterType(type: unknown): boolean {
  return type === undefined || type === null || NUMERIC_PARAMETER_TYPES.has(String(type));
}

export function normalizeParameterBounds(minValue: unknown, maxValue: unknown): ParameterBounds {
  const min = parseNumericMetadataValue(minValue);
  const max = parseNumericMetadataValue(maxValue);

  if (min !== undefined && max !== undefined && min > max) return {};
  return {
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

function autoStep(min: number | undefined, max: number | undefined): number {
  if (min === undefined || max === undefined || !(max > min)) return 0.1;

  const range = (max - min) / 100;
  const exponent = Math.floor(Math.log10(range));
  const scale = 10 ** exponent;
  const normalized = range / scale;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * scale;
}

export function getParameterStep(min: number | undefined, max: number | undefined, explicitStep?: unknown): number {
  const parsedExplicitStep = parseNumericMetadataValue(explicitStep);
  if (parsedExplicitStep !== undefined && parsedExplicitStep > 0) return parsedExplicitStep;
  return autoStep(min, max);
}

export function createParameterMetadata(
  defaultValue: unknown,
  type: unknown,
  minValue: unknown,
  maxValue: unknown,
  stepValue: unknown,
): ParameterMetadata | undefined {
  if (!isNumericParameterType(type)) return undefined;
  const parsedDefault = parseNumericMetadataValue(defaultValue);
  if (parsedDefault === undefined) return undefined;

  const bounds = normalizeParameterBounds(minValue, maxValue);
  return {
    defaultValue: parsedDefault,
    type: type === undefined ? undefined : String(type),
    ...bounds,
    step: getParameterStep(bounds.min, bounds.max, stepValue),
  };
}

export function validateParameterDraft(
  draft: string,
  bounds: ParameterBounds,
): ParameterDraftValidation {
  const trimmed = draft.trim();
  if (!trimmed) return { valid: false, message: 'Enter a value.' };

  const value = toFiniteNumber(trimmed);
  if (value === undefined) return { valid: false, message: 'Enter a finite number.' };
  if (bounds.min !== undefined && value < bounds.min) {
    return { valid: false, message: `Value must be at least ${bounds.min}.` };
  }
  if (bounds.max !== undefined && value > bounds.max) {
    return { valid: false, message: `Value must be at most ${bounds.max}.` };
  }

  return { valid: true, value };
}

export function getProfileOverrides(profile: unknown): Record<string, number> {
  const source = profile && typeof profile === 'object' && !Array.isArray(profile) && 'overrides' in profile
    ? (profile as Record<string, unknown>).overrides
    : profile;
  const overrides: Record<string, number> = {};

  const visit = (value: unknown, path: string) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        visit(child, path ? `${path}.${key}` : key);
      });
      return;
    }

    const parsed = parseNumericMetadataValue(value);
    if (path && parsed !== undefined) overrides[path] = parsed;
  };

  visit(source, '');
  return overrides;
}

export function hasParameterValueChanges(
  current: Record<string, number>,
  baseline: Record<string, number>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  return [...keys].some((key) => current[key] !== baseline[key]);
}
