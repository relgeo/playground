import type { RelGeoDocument } from '@relgeo/core';

interface LeafParam {
  path: string; // e.g. "boltPattern.diameter" or "posisiAwal[0]"
  label: string; // e.g. "boltPattern.diameter" or "posisiAwal[0]"
  customLabel?: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

function extractLeaves(
  key: string,
  val: unknown,
  minVal: unknown,
  maxVal: unknown,
  stepVal: unknown,
  path: string,
  leaves: LeafParam[],
  customLabel?: string
) {
  if (val && typeof val === 'object' && !Array.isArray(val) && 'default' in val) {
    const pObj = val as Record<string, unknown>;
    const actualVal = pObj.default;
    const actualMin = pObj.min !== undefined ? pObj.min : minVal;
    const actualMax = pObj.max !== undefined ? pObj.max : maxVal;
    const actualStep = pObj.step !== undefined ? pObj.step : stepVal;
    const actualLabel = typeof pObj.label === 'string' ? pObj.label : customLabel;
    
    extractLeaves(key, actualVal, actualMin, actualMax, actualStep, path, leaves, actualLabel);
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
        `${path}[${idx}]`,
        leaves,
        customLabel
      );
    });
    return;
  }

  if (val && typeof val === 'object') {
    Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
      const childMin = minVal && typeof minVal === 'object' ? (minVal as Record<string, unknown>)[k] : undefined;
      const childMax = maxVal && typeof maxVal === 'object' ? (maxVal as Record<string, unknown>)[k] : undefined;
      const childStep = stepVal && typeof stepVal === 'object' ? (stepVal as Record<string, unknown>)[k] : undefined;
      extractLeaves(
        `${key}.${k}`,
        v,
        childMin,
        childMax,
        childStep,
        `${path}.${k}`,
        leaves,
        customLabel
      );
    });
    return;
  }

  // Leaf scalar value
  const numVal = parseFloat(String(val)) || 0;
  const numMin = minVal !== undefined ? parseFloat(String(minVal)) : 0;
  const numMax = maxVal !== undefined ? parseFloat(String(maxVal)) : 100;
  const numStep = stepVal !== undefined ? parseFloat(String(stepVal)) : 1;

  leaves.push({
    path,
    label: key,
    customLabel,
    defaultValue: numVal,
    min: numMin,
    max: numMax,
    step: numStep,
  });
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
  return typeof current === 'number' ? current : undefined;
}

interface ParametersCardProps {
  doc: RelGeoDocument | null | undefined;
  paramOverrides: Record<string, number>;
  onParamChange: (key: string, value: number) => void;
  onReset?: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  resolvedValues: Record<string, number>;
}

export function ParametersCard({
  doc,
  paramOverrides,
  onParamChange,
  onReset,
  resolvedValues,
}: ParametersCardProps) {
  if (!doc?.parameters || Object.keys(doc.parameters).length === 0) return null;

  const leaves: LeafParam[] = [];
  Object.entries(doc.parameters).forEach(([key, param]) => {
    let val: unknown = param;
    let minVal: unknown = undefined;
    let maxVal: unknown = undefined;
    let stepVal: unknown = undefined;

    if (param && typeof param === 'object' && !Array.isArray(param) && ('default' in param || 'type' in param)) {
      const pObj = param as Record<string, unknown>;
      val = pObj.default;
      minVal = pObj.min;
      maxVal = pObj.max;
      stepVal = pObj.step;
    }

    extractLeaves(key, val, minVal, maxVal, stepVal, key, leaves);
  });

  const hasOverrides = Object.keys(paramOverrides).length > 0;

  return (
    <div className="parameters-list">
      {hasOverrides && onReset && (
        <div className="parameters-reset-row">
          <button
            type="button"
            onClick={onReset}
            className="action-button secondary parameters-reset"
          >
            Reset
          </button>
        </div>
      )}
      {leaves.map((leaf) => {
        const value = paramOverrides[leaf.path] ?? leaf.defaultValue;
        const resolvedValue = getValueByPath(resolvedValues, leaf.path);

        return (
          <div key={leaf.path} className="param-item">
            <div className="param-row">
              <span className="param-name">{leaf.customLabel ?? leaf.label}</span>
              <span className="param-value">{resolvedValue?.toFixed(2) ?? value}</span>
            </div>
            <input
              type="range"
              aria-label={leaf.customLabel ?? leaf.label}
              min={leaf.min}
              max={leaf.max}
              step={leaf.step}
              value={value}
              onChange={(e) => onParamChange(leaf.path, parseFloat(e.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
