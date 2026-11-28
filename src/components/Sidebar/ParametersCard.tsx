import { useEffect, useMemo, useRef, useState } from 'react';
import type { RelGeoDocument } from '@relgeo/core';
import {
  createParameterMetadata,
  validateParameterDraft,
  type ParameterMetadata,
} from '../../parameter-controls';

interface LeafParam extends ParameterMetadata {
  path: string;
  label: string;
  customLabel?: string;
}

function extractLeaves(
  key: string,
  val: unknown,
  minVal: unknown,
  maxVal: unknown,
  stepVal: unknown,
  typeVal: unknown,
  path: string,
  leaves: LeafParam[],
  customLabel?: string,
) {
  if (val && typeof val === 'object' && !Array.isArray(val) && 'default' in val) {
    const pObj = val as Record<string, unknown>;
    const actualType = pObj.type !== undefined ? pObj.type : typeVal;
    const actualVal = pObj.default;
    const actualMin = pObj.min !== undefined ? pObj.min : minVal;
    const actualMax = pObj.max !== undefined ? pObj.max : maxVal;
    const actualStep = pObj.step !== undefined ? pObj.step : stepVal;
    const actualLabel = typeof pObj.label === 'string' ? pObj.label : customLabel;

    extractLeaves(key, actualVal, actualMin, actualMax, actualStep, actualType, path, leaves, actualLabel);
    return;
  }

  if (Array.isArray(val)) {
    val.forEach((item: unknown, idx: number) => {
      const itemMin = Array.isArray(minVal) ? (minVal as unknown[])[idx] : undefined;
      const itemMax = Array.isArray(maxVal) ? (maxVal as unknown[])[idx] : undefined;
      const itemStep = Array.isArray(stepVal) ? (stepVal as unknown[])[idx] : undefined;
      extractLeaves(
        `${key}[${idx}]`,
        item,
        itemMin,
        itemMax,
        itemStep,
        typeVal,
        `${path}[${idx}]`,
        leaves,
        customLabel,
      );
    });
    return;
  }

  if (val && typeof val === 'object') {
    Object.entries(val as Record<string, unknown>).forEach(([childKey, childValue]) => {
      const childMin = minVal && typeof minVal === 'object' ? (minVal as Record<string, unknown>)[childKey] : undefined;
      const childMax = maxVal && typeof maxVal === 'object' ? (maxVal as Record<string, unknown>)[childKey] : undefined;
      const childStep = stepVal && typeof stepVal === 'object' ? (stepVal as Record<string, unknown>)[childKey] : undefined;
      extractLeaves(
        `${key}.${childKey}`,
        childValue,
        childMin,
        childMax,
        childStep,
        typeVal,
        `${path}.${childKey}`,
        leaves,
        customLabel,
      );
    });
    return;
  }

  const metadata = createParameterMetadata(val, typeVal, minVal, maxVal, stepVal);
  if (!metadata) return;
  leaves.push({ path, label: key, customLabel, ...metadata });
}

function getValueByPath(obj: Record<string, unknown> | null | undefined, path: string): number | undefined {
  if (!obj) return undefined;
  const parts = path.split(/\.|(?=\[)/);
  let current: unknown = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    if (part.startsWith('[')) {
      const idx = parseInt(part.slice(1, -1), 10);
      if (!Array.isArray(current)) return undefined;
      current = current[idx];
    } else {
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
  }
  return typeof current === 'number' && Number.isFinite(current) ? current : undefined;
}

function getLeaves(doc: RelGeoDocument | null | undefined): LeafParam[] {
  if (!doc?.parameters) return [];

  const leaves: LeafParam[] = [];
  Object.entries(doc.parameters).forEach(([key, param]) => {
    let val: unknown = param;
    let minVal: unknown = undefined;
    let maxVal: unknown = undefined;
    let stepVal: unknown = undefined;
    let typeVal: unknown = undefined;

    if (param && typeof param === 'object' && !Array.isArray(param) && ('default' in param || 'type' in param)) {
      const pObj = param as Record<string, unknown>;
      val = pObj.default;
      minVal = pObj.min;
      maxVal = pObj.max;
      stepVal = pObj.step;
      typeVal = pObj.type;
    }

    extractLeaves(key, val, minVal, maxVal, stepVal, typeVal, key, leaves);
  });
  return leaves;
}

interface ParametersCardProps {
  doc: RelGeoDocument | null | undefined;
  paramOverrides: Record<string, number>;
  onParamChange: (key: string, value: number) => void;
  baselineOverrides: Record<string, number>;
  resetSignal: number;
  onResetStateChange?: (state: {
    hasValueChanges: boolean;
    hasDraftChanges: boolean;
    hasInvalidDrafts: boolean;
  }) => void;
  resolvedValues: Record<string, number>;
  baselineKey: string;
}

export function ParametersCard({
  doc,
  paramOverrides,
  onParamChange,
  baselineOverrides,
  resetSignal,
  onResetStateChange,
  resolvedValues,
  baselineKey,
}: ParametersCardProps) {
  const leaves = useMemo(() => getLeaves(doc), [doc]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initializedBaseline = useRef<string | null>(null);
  const appliedResetSignal = useRef(resetSignal);
  const leafSignature = leaves
    .map((leaf) => `${leaf.path}:${leaf.defaultValue}:${leaf.min ?? ''}:${leaf.max ?? ''}:${leaf.step}`)
    .join('|');
  const baselineSignature = `${baselineKey}|${leafSignature}`;

  useEffect(() => {
    if (initializedBaseline.current === baselineSignature) return;
    initializedBaseline.current = baselineSignature;
    setDrafts(Object.fromEntries(leaves.map((leaf) => [
      leaf.path,
      String(paramOverrides[leaf.path] ?? leaf.defaultValue),
    ])));
    setErrors({});
  }, [baselineSignature, leaves, paramOverrides]);

  useEffect(() => {
    if (appliedResetSignal.current === resetSignal) return;
    appliedResetSignal.current = resetSignal;
    setDrafts(Object.fromEntries(leaves.map((leaf) => [
      leaf.path,
      String(paramOverrides[leaf.path] ?? leaf.defaultValue),
    ])));
    setErrors({});
  }, [leaves, paramOverrides, resetSignal]);

  const resetState = useMemo(() => {
    const hasValueChanges = leaves.some((leaf) => {
      const currentValue = paramOverrides[leaf.path] ?? leaf.defaultValue;
      const baselineValue = baselineOverrides[leaf.path] ?? leaf.defaultValue;
      return currentValue !== baselineValue;
    });
    const hasDraftChanges = leaves.some((leaf) => {
      const currentValue = paramOverrides[leaf.path] ?? leaf.defaultValue;
      return drafts[leaf.path] !== undefined && drafts[leaf.path] !== String(currentValue);
    });
    return {
      hasValueChanges,
      hasDraftChanges,
      hasInvalidDrafts: Object.keys(errors).length > 0,
    };
  }, [baselineOverrides, drafts, errors, leaves, paramOverrides]);

  useEffect(() => {
    onResetStateChange?.(resetState);
  }, [onResetStateChange, resetState]);

  if (!doc?.parameters || Object.keys(doc.parameters).length === 0 || leaves.length === 0) return null;

  return (
    <div className="parameters-list">
      {leaves.map((leaf) => {
        const value = paramOverrides[leaf.path] ?? leaf.defaultValue;
        const resolvedValue = getValueByPath(resolvedValues, leaf.path);
        const label = leaf.customLabel ?? leaf.label;
        const inputId = `parameter-input-${leaf.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        const errorId = `${inputId}-error`;
        const error = errors[leaf.path];

        return (
          <div key={leaf.path} className="param-item">
            <div className="param-row">
              <label className="param-name" htmlFor={inputId}>{label}</label>
              <span className="param-value">{resolvedValue?.toFixed(2) ?? value}</span>
            </div>
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              aria-label={label}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? errorId : undefined}
              min={leaf.min}
              max={leaf.max}
              step={leaf.step}
              value={drafts[leaf.path] ?? String(value)}
              onChange={(event) => {
                const nextDraft = event.currentTarget.value;
                setDrafts((previous) => ({ ...previous, [leaf.path]: nextDraft }));
                const validation = validateParameterDraft(nextDraft, leaf);
                if (!validation.valid || validation.value === undefined) {
                  setErrors((previous) => ({ ...previous, [leaf.path]: validation.message ?? 'Enter a valid number.' }));
                  return;
                }
                setErrors((previous) => {
                  const next = { ...previous };
                  delete next[leaf.path];
                  return next;
                });
                onParamChange(leaf.path, validation.value);
              }}
            />
            {error && <p id={errorId} className="param-error" role="alert">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
