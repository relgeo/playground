import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import type { KeyboardEvent } from 'react';
import { ICONS } from './Icons';
import type { InspectorTab } from '../types';
import { getDependencyGraph } from '@relgeo/core';
import type { RelGeoDocument, ResolvedScene, RelGeoError, ResolvedObject, PathResolvedSegment, ConstraintViolation } from '@relgeo/core';
import { getClosedShapeMetricLabel, getRelatedObjectIds } from '../inspector-helpers';

const GraphViewer = lazy(() => import('./GraphViewer').then((m) => ({ default: m.GraphViewer })));

interface InspectorProps {
  tab: InspectorTab;
  setTab: (tab: InspectorTab) => void;
  data: ResolvedScene | null;
  doc?: RelGeoDocument;
  code?: string;
  fullError?: RelGeoError | null;
  exampleName?: string;
  objectCount?: number;
  valueCount?: number;
  unit?: string;
  selectedObjectId?: string | null;
  relatedObjectIds?: string[];
  relatedDepth?: number;
  onRelatedDepthChange?: (depth: number) => void;
  onSelectObject?: (objectId: string | null) => void;
  onJumpToLine?: (lineNum: number) => void;
  onJumpToPath?: (path: string) => void;
}

export function Inspector({
  tab,
  setTab,
  data,
  doc,
  code = '',
  fullError,
  exampleName,
  objectCount,
  valueCount,
  unit = 'mm',
  selectedObjectId = null,
  relatedObjectIds = [],
  relatedDepth = 2,
  onRelatedDepthChange,
  onSelectObject,
  onJumpToLine,
  onJumpToPath,
}: InspectorProps) {
  const [expandedObjects, setExpandedObjects] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [objectQuery, setObjectQuery] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const previousSelectedObjectId = useRef<string | null>(null);
  const inspectorTabs: InspectorTab[] = ['resolved', 'values', 'errors', 'graph', 'bom'];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: InspectorTab) => {
    const currentIndex = inspectorTabs.indexOf(currentTab);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % inspectorTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + inspectorTabs.length) % inspectorTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = inspectorTabs.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = inspectorTabs[nextIndex];
    setTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`inspector-tab-${nextTab === 'resolved' ? 'objects' : nextTab}`)?.focus();
    });
  };

  const toggleExpand = (objectId: string) => {
    onSelectObject?.(objectId);
    setExpandedObjects((prev) => ({ ...prev, [objectId]: !prev[objectId] }));
  };

  useEffect(() => {
    if (!selectedObjectId) {
      previousSelectedObjectId.current = null;
      return;
    }
    setExpandedObjects((prev) => ({ ...prev, [selectedObjectId]: true }));
    if (previousSelectedObjectId.current !== selectedObjectId && tab !== 'resolved') {
      setTab('resolved');
    }
    previousSelectedObjectId.current = selectedObjectId;
  }, [selectedObjectId, setTab, tab]);

  useEffect(() => {
    if (!selectedObjectId || tab !== 'resolved' || typeof document === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
      const selectedCard = Array.from(
        document.querySelectorAll<HTMLElement>('[data-inspector-object-id]')
      ).find((element) => element.dataset.inspectorObjectId === selectedObjectId);
      selectedCard?.scrollIntoView({ block: 'nearest' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [data, objectQuery, selectedObjectId, showSelectedOnly, tab]);

  // Helper to find the line number of an object in the YAML code
  const findLineForObject = (objectId: string): number => {
    if (!doc || !doc.objects) return 0;

    // Prioritize searching the raw editor code directly passed as string
    if (code) {
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith(objectId + ':')) {
          return i;
        }
      }
    }

    // Fallback to DOM lookup if code is not available
    const editorEl = document.querySelector('.cm-content');
    if (editorEl) {
      const text = editorEl.textContent || '';
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith(objectId + ':')) {
          return i;
        }
      }
    }
    return 0;
  };

  const handleJump = (objectId: string) => {
    onSelectObject?.(objectId);
    if (onJumpToLine && !onSelectObject) {
      const line = findLineForObject(objectId);
      onJumpToLine(line);
    }
  };

  const getSourceObject = (objectId: string) => {
    return doc?.objects?.[objectId];
  };

  const renderMetadataDetails = (objectId: string, resolvedObj: ResolvedObject) => {
    const sourceObj = getSourceObject(objectId) as Record<string, unknown> | undefined;
    const resolvedMeta = (resolvedObj.meta ?? {}) as Record<string, unknown>;
    const sourceMeta = sourceObj?.meta && typeof sourceObj.meta === 'object'
      ? (sourceObj.meta as Record<string, unknown>)
      : undefined;
    const presetName = typeof sourceObj?.metaPreset === 'string'
      ? sourceObj.metaPreset
      : typeof sourceObj?.style === 'string'
        ? sourceObj.style
        : undefined;
    const intent = typeof resolvedMeta.intent === 'string'
      ? resolvedMeta.intent
      : typeof sourceMeta?.intent === 'string'
        ? sourceMeta.intent
        : undefined;
    const inheritSource = sourceMeta?.inherit;
    const inheritText = Array.isArray(inheritSource)
      ? inheritSource.join(' -> ')
      : typeof inheritSource === 'string'
        ? inheritSource
        : null;
    const role = typeof resolvedMeta.role === 'string' ? resolvedMeta.role : null;
    const label = typeof resolvedMeta.label === 'string' ? resolvedMeta.label : null;
    const localMetaKeys = sourceMeta
      ? Object.keys(sourceMeta).filter((key) => key !== 'inherit')
      : [];

    if (!presetName && !intent && !inheritText && !role && !label && localMetaKeys.length === 0) {
      return null;
    }

    return (
      <div className="inspector-detail-section">
        <span className="inspector-detail-label">Metadata</span>
        <div className="inspector-meta-hint">
          Resolved values are shown below together with source hints from the current object declaration.
        </div>
        {role && (
          <div className="inspector-detail-row">
            <span className="inspector-detail-key">Resolved Role</span>
            <span className="inspector-detail-value">{role}</span>
          </div>
        )}
        {intent && (
          <div className="inspector-detail-row">
            <span className="inspector-detail-key">Resolved Intent</span>
            <span className="inspector-detail-value">{intent}</span>
          </div>
        )}
        {label && (
          <div className="inspector-detail-row">
            <span className="inspector-detail-key">Resolved Label</span>
            <span className="inspector-detail-value">{label}</span>
          </div>
        )}
        {presetName && (
          <div className="inspector-detail-row">
            <span className="inspector-detail-key">Preset Ref</span>
            <span className="inspector-detail-value">{presetName}</span>
          </div>
        )}
        {inheritText && (
          <div className="inspector-detail-row">
            <span className="inspector-detail-key">Inherit Ref</span>
            <span className="inspector-detail-value">{inheritText}</span>
          </div>
        )}
        {(presetName || inheritText || localMetaKeys.length > 0) && (
          <div className="inspector-detail-row">
            <span className="inspector-detail-key">Source Order</span>
            <span className="inspector-detail-value">
              metaPreset -&gt; inherit -&gt; local meta
            </span>
          </div>
        )}
        {localMetaKeys.length > 0 && (
          <div className="inspector-detail-row">
            <span className="inspector-detail-key">Local Meta Keys</span>
            <div className="inspector-meta-keys">
              {localMetaKeys.map((key) => (
                <span key={key} className="inspector-meta-key">
                  {key}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGeometryDetails = (obj: ResolvedObject) => {
    if (!obj || !obj.type) return null;

    const fmt = (num: unknown, decimals = 2): string => {
      if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) return '?';
      return num.toFixed(decimals);
    };

    const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.74rem' };
    const labelStyle = { color: 'var(--muted)', fontWeight: 500 };
    const valStyle = { fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontWeight: 600 };

    switch (obj.type) {
      case 'point':
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Coordinate</span>
              <span style={valStyle}>({fmt(obj.x)}, {fmt(obj.y)}) {unit}</span>
            </div>
          </div>
        );

      case 'line':
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Start Point</span>
              <span style={valStyle}>({fmt(obj.start?.x)}, {fmt(obj.start?.y)})</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>End Point</span>
              <span style={valStyle}>({fmt(obj.end?.x)}, {fmt(obj.end?.y)})</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Length</span>
              <span style={valStyle}>{fmt(obj.length)} {unit}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Angle</span>
              <span style={valStyle}>
                {obj.end && obj.start
                  ? fmt(Math.atan2(obj.end.y - obj.start.y, obj.end.x - obj.start.x) * (180 / Math.PI), 1) + '°'
                  : '?'}
              </span>
            </div>
          </div>
        );

      case 'rect':
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Size</span>
              <span style={valStyle}>{fmt(obj.width)} × {fmt(obj.height)} {unit}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Area</span>
              <span style={valStyle}>
                {obj.width !== undefined && obj.height !== undefined
                  ? fmt(obj.width * obj.height)
                  : '?'} {unit}²
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Center</span>
              <span style={valStyle}>({fmt(obj.center?.x)}, {fmt(obj.center?.y)})</span>
            </div>
          </div>
        );

      case 'circle':
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Center</span>
              <span style={valStyle}>({fmt(obj.center?.x)}, {fmt(obj.center?.y)})</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Radius</span>
              <span style={valStyle}>{fmt(obj.radius)} {unit}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Area</span>
              <span style={valStyle}>
                {obj.radius !== undefined
                  ? fmt(Math.PI * obj.radius * obj.radius)
                  : '?'} {unit}²
              </span>
            </div>
          </div>
        );

      case 'arc':
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Center</span>
              <span style={valStyle}>({fmt(obj.center?.x)}, {fmt(obj.center?.y)})</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Radius</span>
              <span style={valStyle}>{fmt(obj.radius)}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Angles</span>
              <span style={valStyle}>
                {obj.startAngle !== undefined
                  ? fmt(obj.startAngle * 180 / Math.PI, 0) + '°'
                  : '?'} to {obj.endAngle !== undefined
                    ? fmt(obj.endAngle * 180 / Math.PI, 0) + '°'
                    : '?'}
              </span>
            </div>
          </div>
        );

      case 'path':
      case 'polygon': {
        const closed = !!obj.closed || obj.type === 'polygon';
        const lengthLabel = getClosedShapeMetricLabel(obj.type, closed);
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Closed Status</span>
              <span style={{ ...valStyle, color: closed ? 'var(--ready)' : 'var(--accent)' }}>{closed ? 'CLOSED' : 'OPEN'}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>{lengthLabel}</span>
              <span style={valStyle}>{fmt(obj.length)} {unit}</span>
            </div>
            {closed && obj.area !== undefined && (
              <div style={rowStyle}>
                <span style={labelStyle}>Subtracted Area</span>
                <span style={valStyle}>{fmt(obj.area)} {unit}²</span>
              </div>
            )}
            {obj.segments && obj.segments.length > 0 && (
              <div style={{ marginTop: '0.4rem' }}>
                <span style={{ ...labelStyle, fontSize: '0.68rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Segments ({obj.segments.length})</span>
                <div style={{ paddingLeft: '0.4rem', borderLeft: '2px solid var(--brand-soft)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  {obj.segments.map((seg: PathResolvedSegment, idx: number) => (
                    <div key={idx} style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>#{idx} {seg.type}</span>
                      <span>to ({fmt(seg.x2, 0)}, {fmt(seg.y2, 0)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {obj.holes && obj.holes.length > 0 && (
              <div style={{ marginTop: '0.4rem' }}>
                <span style={{ ...labelStyle, fontSize: '0.68rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem', color: 'var(--error)' }}>Holes ({obj.holes.length})</span>
                <div style={{ paddingLeft: '0.4rem', borderLeft: '2px solid var(--error-soft)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {obj.holes.map((hole: { segments: PathResolvedSegment[] }, idx: number) => (
                    <div key={idx} style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Hole #{idx}</span>
                      <span style={valStyle}>Segs: {hole.segments?.length || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'text':
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Content</span>
              <span style={valStyle}>"{obj.content}"</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Font Size</span>
              <span style={valStyle}>{obj.fontSize}px</span>
            </div>
          </div>
        );

      case 'group':
      case 'clone':
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Transform</span>
              <span style={valStyle}>Matrix / Group</span>
            </div>
          </div>
        );

      case 'collection': {
        const children: string[] = obj.children ?? [];
        const points: { x: number; y: number }[] | undefined = (obj as Record<string, unknown>).points as { x: number; y: number }[] | undefined;
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Children</span>
              <span style={valStyle}>{children.length} item{children.length !== 1 ? 's' : ''}</span>
            </div>
            {points && points.length > 0 && (
              <div style={rowStyle}>
                <span style={labelStyle}>Points</span>
                <span style={valStyle}>{points.length} pt{points.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {children.length > 0 && (
              <div style={{ marginTop: '0.35rem' }}>
                <span style={{ ...labelStyle, fontSize: '0.68rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>IDs (Click to drill down)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                  {children.slice(0, 16).map((cid: string) => (
                    <button
                      type="button"
                      key={cid} 
                      onClick={() => toggleExpand(cid)}
                      style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', background: 'var(--brand-soft)', color: 'var(--brand)', padding: '0.1rem 0.3rem', borderRadius: '3px', border: 0, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {cid}
                    </button>
                  ))}
                  {children.length > 16 && <code style={{ fontSize: '0.64rem', color: 'var(--muted)' }}>+{children.length - 16} more</code>}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'component': {
        const compChildren: string[] = obj.children ?? [];
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Uses</span>
              <span style={valStyle}>{(obj as Record<string, unknown>).use as string ?? '?'}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Inner Objects</span>
              <span style={valStyle}>{compChildren.length}</span>
            </div>
            {compChildren.length > 0 && (
              <div style={{ marginTop: '0.35rem' }}>
                <span style={{ ...labelStyle, fontSize: '0.68rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Children (Click to drill down)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                  {compChildren.map((cid: string) => (
                    <button
                      type="button"
                      key={cid} 
                      onClick={() => toggleExpand(cid)}
                      style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', background: 'var(--brand-soft)', color: 'var(--brand)', padding: '0.1rem 0.3rem', borderRadius: '3px', border: 0, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {cid.replace(`${obj.id}.`, '')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {obj.anchors && Object.keys(obj.anchors).length > 0 && (
              <div style={rowStyle}>
                <span style={labelStyle}>Exports</span>
                <span style={valStyle}>{Object.keys(obj.anchors).join(', ')}</span>
              </div>
            )}
          </div>
        );
      }

      case 'dimension': {
        const dim = obj as unknown as Record<string, unknown>;
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Kind</span>
              <span style={{ ...valStyle, textTransform: 'uppercase', fontSize: '0.68rem', background: 'var(--brand-soft)', color: 'var(--brand)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{dim.kind}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Value</span>
              <span style={valStyle}>{dim.text || '?'}</span>
            </div>
            {dim.distance !== undefined && (
              <div style={rowStyle}>
                <span style={labelStyle}>Distance</span>
                <span style={valStyle}>{fmt(dim.distance)} {unit}</span>
              </div>
            )}
            {dim.angle !== undefined && (
              <div style={rowStyle}>
                <span style={labelStyle}>Angle</span>
                <span style={valStyle}>{fmt(dim.angle, 1)}°</span>
              </div>
            )}
            {dim.from && dim.to && (
              <div style={rowStyle}>
                <span style={labelStyle}>From → To</span>
                <span style={valStyle}>({fmt(dim.from.x, 0)},{fmt(dim.from.y, 0)}) → ({fmt(dim.to.x, 0)},{fmt(dim.to.y, 0)})</span>
              </div>
            )}
          </div>
        );
      }

      case 'annotation': {
        const ann = obj as unknown as Record<string, unknown>;
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Text</span>
              <span style={valStyle}>"{ann.text}"</span>
            </div>
            {ann.target && (
              <div style={rowStyle}>
                <span style={labelStyle}>Target</span>
                <span style={valStyle}>{ann.target}</span>
              </div>
            )}
            {ann.leader && (
              <div style={rowStyle}>
                <span style={labelStyle}>Leader</span>
                <span style={valStyle}>({fmt(ann.leader.from?.x, 0)},{fmt(ann.leader.from?.y, 0)}) → ({fmt(ann.leader.to?.x, 0)},{fmt(ann.leader.to?.y, 0)})</span>
              </div>
            )}
          </div>
        );
      }

      case 'boolean': {
        const b = obj as unknown as Record<string, unknown>;
        return (
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--line)', paddingTop: '0.4rem' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Operation</span>
              <span style={{ ...valStyle, textTransform: 'uppercase', color: 'var(--accent)' }}>{b.op || 'UNION'}</span>
            </div>
            {b.operands && b.operands.length > 0 && (
              <div style={rowStyle}>
                <span style={labelStyle}>Operands</span>
                <span style={valStyle}>{b.operands.join(', ')}</span>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderObjectsTab = () => {
    const rData = data;
    if (!rData || !rData.objects || Object.keys(rData.objects).length === 0) {
      return (
        <div className="inspector-empty-state">
          No resolved geometric objects available.
        </div>
      );
    }

    const normalizedQuery = objectQuery.trim().toLowerCase();
    const objectEntries = (Object.entries(rData.objects) as [string, ResolvedObject][]).filter(([id, obj]) => {
      const matchesQuery = !normalizedQuery
        || id.toLowerCase().includes(normalizedQuery)
        || obj.type.toLowerCase().includes(normalizedQuery);
      const matchesSelection = !showSelectedOnly || id === selectedObjectId;
      return matchesQuery && matchesSelection;
    });
    const groupedEntries = new Map<string, [string, ResolvedObject][]>();
    for (const entry of objectEntries) {
      const group = entry[0].includes('[')
        ? `${entry[0].split('[')[0]} (generated)`
        : entry[0].includes('.')
          ? entry[0].split('.')[0]
          : 'Top-level';
      const groupEntries = groupedEntries.get(group) ?? [];
      groupEntries.push(entry);
      groupedEntries.set(group, groupEntries);
    }
    const dependencyGraph = doc?.objects ? getDependencyGraph(doc.objects) : [];

    return (
      <div className="inspector-tab-content">
        <div className="inspector-filter">
          <label className="inspector-filter-label" htmlFor="inspector-object-filter">
            Find object
          </label>
          <input
            id="inspector-object-filter"
            type="search"
            value={objectQuery}
            onChange={(event) => setObjectQuery(event.target.value)}
            placeholder="Name or type…"
            aria-label="Find object by name or type"
            className="inspector-filter-input"
          />
          <label className="inspector-filter-option">
            <input
              type="checkbox"
              checked={showSelectedOnly}
              onChange={(event) => setShowSelectedOnly(event.target.checked)}
              aria-label="Show selected object only"
            />
            Selected only
          </label>
          {onRelatedDepthChange && (
            <label className="inspector-related-depth">
            <span>Related depth</span>
            <select
              value={relatedDepth}
              onChange={(event) => onRelatedDepthChange(Number(event.target.value))}
              aria-label="Related object depth"
            >
              <option value={1}>1 level</option>
              <option value={2}>2 levels</option>
              <option value={3}>3 levels</option>
            </select>
            </label>
          )}
          {selectedObjectId && (
            <button
              type="button"
              className="inspector-clear-selection"
              onClick={() => {
                onSelectObject?.(null);
                setShowSelectedOnly(false);
              }}
              aria-label={`Clear selected object ${selectedObjectId}`}
            >
              Clear selection: {selectedObjectId}
            </button>
          )}
          <span className="inspector-result-count" role="status" aria-live="polite">
            Showing {objectEntries.length} of {Object.keys(rData.objects).length} objects
          </span>
        </div>
        <div className="inspector-object-list">
        {Array.from(groupedEntries.entries()).map(([group, entries]) => (
          (() => {
            const groupContainsSelection = Boolean(
              selectedObjectId && entries.some(([entryId]) => entryId === selectedObjectId)
            );
            const groupRelatedCount = entries.filter(([entryId]) => relatedObjectIds.includes(entryId)).length;
            const groupContainsRelated = groupRelatedCount > 0;
            const groupIsForcedOpen = Boolean(normalizedQuery) || showSelectedOnly || groupContainsSelection || groupContainsRelated;
            const groupIsCollapsed = collapsedGroups[group] ?? group.endsWith('(generated)');
            const groupSummary = [
              `${entries.length} object${entries.length === 1 ? '' : 's'}`,
              groupContainsSelection ? 'selected' : '',
              groupContainsRelated ? `${groupRelatedCount} related` : '',
            ].filter(Boolean).join(', ');

            return (
          <details
            key={group}
            open={groupIsForcedOpen || !groupIsCollapsed}
            onToggle={(event) => {
              if (groupIsForcedOpen) return;
              const isOpen = event.currentTarget.open;
              setCollapsedGroups((prev) => ({
                ...prev,
                [group]: !isOpen,
              }));
            }}
            className="inspector-object-group"
          >
            <summary className="inspector-object-group-summary" aria-label={`${group}: ${groupSummary}`}>
              <span>{group}</span>
              <span className="inspector-object-group-meta">
                <span>{groupContainsSelection ? 'selected' : ''}</span>
                <span>{groupContainsRelated ? `${groupRelatedCount} related` : ''}</span>
                <strong>{entries.length}</strong>
              </span>
            </summary>
            <div className="inspector-object-group-entries">
        {entries.map(([id, obj]: [string, ResolvedObject]) => {
          const isExpanded = !!expandedObjects[id];
          const objectRelatedIds = getRelatedObjectIds(
            dependencyGraph,
            id,
            Object.keys(rData.objects),
            relatedDepth,
          );
          const isRelated = relatedObjectIds.includes(id);
          return (
            <div
              key={id}
              data-inspector-object-id={id}
              className={`inspector-object-card${selectedObjectId === id ? ' is-selected' : ''}${isRelated ? ' is-related' : ''}${isExpanded ? ' is-expanded' : ''}`}
            >
              {/* Header Card */}
              <div className="inspector-object-card-header">
                <div className="inspector-object-heading">
                  <button
                    type="button"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} object ${id}`}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpand(id)}
                    className="inspector-object-chevron"
                  >
                    {isExpanded ? ICONS.ChevronUp : ICONS.ChevronDown}
                  </button>
                  <button
                    type="button"
                    className="inspector-object-select"
                    onClick={() => toggleExpand(id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} and select object ${id}`}
                  >
                    <strong className="inspector-object-id">{id}</strong>
                    <span className="inspector-object-type">
                      {obj.type}
                    </span>
                  </button>
                </div>

                <div className="inspector-object-actions">
                  <button
                    type="button"
                    onClick={() => handleJump(id)}
                    title="Jump to code definition"
                    aria-label={`Jump to ${id} code definition`}
                    className="inspector-source-jump"
                  >
                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Collapsed Detailed View */}
              {isExpanded && (
                <div className="inspector-object-details">
                  {renderGeometryDetails(obj)}
                  {renderMetadataDetails(id, obj)}

                  {/* Render Anchors if they exist */}
                  {obj.anchors && Object.keys(obj.anchors).length > 0 && (
                    <div className="inspector-anchor-section">
                      <span className="inspector-detail-label">Anchors</span>
                      <div className="inspector-anchor-grid">
                        {Object.entries(obj.anchors).map(([anchorName, anchorVal]) => (
                          <div
                            key={anchorName}
                            className="inspector-anchor"
                          >
                            <span className="inspector-anchor-name">{anchorName}</span>
                            <span className="inspector-detail-value">
                              {typeof anchorVal === 'number'
                                ? anchorVal.toFixed(1)
                                : anchorVal && typeof anchorVal.x === 'number' && typeof anchorVal.y === 'number'
                                  ? `(${anchorVal.x.toFixed(0)}, ${anchorVal.y.toFixed(0)})`
                                  : '?'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {objectRelatedIds.length > 0 && (
                    <div className="inspector-related-objects">
                      <span className="inspector-related-label">Related objects</span>
                      <div className="inspector-related-list">
                        {objectRelatedIds.map((relatedId) => (
                          <button
                            key={relatedId}
                            type="button"
                            onClick={() => handleJump(relatedId)}
                            aria-label={`Select related object ${relatedId}`}
                          >
                            {relatedId}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
            </div>
          </details>
            );
          })()
        ))}
        {objectEntries.length === 0 && (
          <div className="inspector-filter-empty">
            No objects match this filter.
          </div>
        )}
        </div>
      </div>
    );
  };

  const renderValuesTab = () => {
    const values = data?.values ?? {};
    if (Object.keys(values).length === 0) {
      return (
        <div className="inspector-empty-state">
          No parameters or derived scalar values resolved.
        </div>
      );
    }

    return (
      <div className="inspector-values-list">
        {Object.entries(values).map(([key, val]) => (
          <div key={key} className="inspector-value-card">
            <RecursiveTree label={key} value={val} path={key} />
          </div>
        ))}
      </div>
    );
  };

  function RecursiveTree({ label, value, path = "" }: { label: string; value: unknown; path?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const isObj = value !== null && typeof value === 'object';
    
    if (!isObj) {
      return (
        <div className="inspector-value-row">
          <span className="inspector-value-label">{label}</span>
          <span className="inspector-value-result">
            {typeof value === 'number' ? value.toFixed(3).replace(/\.?0+$/, '') : String(value)}
          </span>
        </div>
      );
    }

    const valObj = value as Record<string, unknown>;
    const keys = Object.keys(valObj);
    const isArr = Array.isArray(value);
    const typeLabel = isArr ? `Array[${keys.length}]` : `Object`;

    return (
      <div className="inspector-tree-node">
        <button
          type="button"
          className="inspector-tree-toggle"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label} ${typeLabel}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="inspector-tree-caret">
            {isOpen ? '▼' : '▶'}
          </span>
          <span className="inspector-tree-key">{label}</span>
          <span className="inspector-value-type">{typeLabel}</span>
        </button>
        {isOpen && (
          <div className="inspector-tree-branch">
            {keys.map(k => (
              <RecursiveTree key={k} label={k} value={valObj[k]} path={`${path}.${k}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const renderBomTab = () => {
    const rData = data;
    if (!rData || !rData.objects || Object.keys(rData.objects).length === 0) {
      return (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
          No manufacturing data available.
        </div>
      );
    }

    const bomMap: Record<string, { count: number; details: string; type: string }> = {};
    let totalCutLength = 0;
    let totalArea = 0;

    Object.values(rData.objects).forEach((resolvedObj: ResolvedObject) => {
      const obj = resolvedObj as unknown as Record<string, unknown>;
      if (typeof obj.length === 'number') totalCutLength += obj.length;
      
      let key: string;
      if (obj.type === "component") {
        const useName = (obj.use as string) || "custom";
        key = `Component: ${useName}`;
        if (!bomMap[key]) {
          bomMap[key] = { count: 0, details: `Template component instance`, type: 'Component' };
        }
      } else if (obj.type === "circle") {
        const r = (obj.radius as number) ?? 0;
        key = `Hole/Circle (r=${r.toFixed(1)})`;
        if (!bomMap[key]) {
          bomMap[key] = { count: 0, details: `Diameter: ${(r*2).toFixed(1)}${unit}, Area: ${(Math.PI*r*r).toFixed(1)}${unit}²`, type: 'Hole' };
        }
        totalArea += Math.PI * r * r;
      } else if (obj.type === "rect") {
        const w = (obj.width as number) ?? 0;
        const h = (obj.height as number) ?? 0;
        key = `Rectangle (${w.toFixed(1)}x${h.toFixed(1)})`;
        if (!bomMap[key]) {
          bomMap[key] = { count: 0, details: `Perimeter: ${(w*2 + h*2).toFixed(1)}${unit}, Area: ${(w*h).toFixed(1)}${unit}²`, type: 'Plate' };
        }
        totalArea += w * h;
      } else {
        key = `Primitive: ${obj.type as string}`;
        if (!bomMap[key]) {
          bomMap[key] = { count: 0, details: `Generic geometric shape`, type: 'Geometry' };
        }
      }
      bomMap[key].count++;
    });

    return (
      <div className="inspector-bom-list">
        <div className="inspector-bom-summary">
          <div className="inspector-bom-metric">
            <span className="inspector-bom-metric-label">Total Cut Length</span>
            <strong>{totalCutLength.toFixed(2)} {unit}</strong>
          </div>
          <div className="inspector-bom-metric">
            <span className="inspector-bom-metric-label">Material Area</span>
            <strong>{totalArea.toFixed(2)} {unit}²</strong>
          </div>
        </div>

        <div className="inspector-bom-table-wrap">
          <table className="inspector-bom-table">
            <thead>
              <tr>
                <th>Part Item</th>
                <th>Qty</th>
                <th>Specs</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bomMap).map(([partName, item]) => (
                <tr key={partName}>
                  <td>{partName}</td>
                  <td>{item.count}</td>
                  <td>{item.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderErrorsTab = () => {
    const rData = data;
    const rError = fullError;
    const hasViolations = rData?.violations && rData.violations.length > 0;
    const firstViolation = rData?.violations?.[0];
    const firstErrorObjectId = rError?.objectId ?? firstViolation?.objectId;
    const firstErrorPath = !firstErrorObjectId ? rError?.path : undefined;
    const hasFirstErrorTarget = Boolean(firstErrorObjectId || firstErrorPath);
    const errorCount = (rError ? 1 : 0) + (rData?.violations?.length ?? 0);

    const handleJumpToFirstError = () => {
      if (firstErrorObjectId) {
        handleJump(firstErrorObjectId);
        return;
      }
      if (firstErrorPath && onJumpToPath) {
        onJumpToPath(firstErrorPath);
      }
    };

    if (!rError && !hasViolations) {
      return (
        <div className="inspector-empty-success">
          ✨ No errors or constraint violations detected!
        </div>
      );
    }

    return (
      <div className="inspector-errors-list">
        <div
          className="inspector-error-summary"
          role="alert"
          aria-live="assertive"
          aria-label={`${errorCount} diagnostic${errorCount === 1 ? '' : 's'} found${hasFirstErrorTarget ? '. A first-error action is available.' : '.'}`}
          >
            <span>{errorCount} diagnostic{errorCount === 1 ? '' : 's'} found</span>
            {hasFirstErrorTarget && (
              <button
              type="button"
              onClick={handleJumpToFirstError}
              aria-label="Jump to first error"
              >
                Go to first error
              </button>
            )}
            {!hasFirstErrorTarget && (
              <span className="inspector-error-summary-hint">Fix source or reset draft</span>
            )}
          </div>
        {rError && (
          <div
            className="inspector-error-card"
            role="alert"
            aria-live="assertive"
            aria-labelledby="inspector-error-code"
            aria-describedby="inspector-error-message"
          >
            <div className="inspector-error-header">
              <span className="inspector-error-code" id="inspector-error-code">
                Error Code: {rError.path ? 'VALIDATION_FAILED' : 'COMPILE_ERROR'}
              </span>
              {rError.objectId && (
                <button
                  type="button"
                  onClick={() => handleJump(rError.objectId!)}
                  aria-label={`Jump to object ${rError.objectId} definition`}
                  className="inspector-error-object-link"
                  title="Jump to object definition"
                >
                  obj: {rError.objectId} ↗
                </button>
              )}
            </div>
            <p className="inspector-error-message" id="inspector-error-message">
              {rError.message}
            </p>

            {!rError.objectId && rError.path && onJumpToPath && (
              <button
                type="button"
                onClick={() => onJumpToPath(rError.path!)}
                aria-label="Jump to error location"
                className="inspector-error-path-action"
              >
                Go to error location
              </button>
            )}

            {rError.dependencyChain && rError.dependencyChain.length > 0 && (
              <div className="inspector-dependency-chain">
                <span className="inspector-dependency-chain-label">Circular Dependency Chain</span>
                <div className="inspector-dependency-chain-items">
                  {rError.dependencyChain.map((node: string, idx: number) => (
                    <span key={idx} className="inspector-dependency-node">
                      <button
                        type="button"
                        onClick={() => handleJump(node)}
                        aria-label={`Jump to ${node} definition`}
                        className="inspector-dependency-node-button"
                      >
                        {node}
                      </button>
                      {idx < rError.dependencyChain.length - 1 && <span className="inspector-dependency-arrow">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {hasViolations && (
          <section className="inspector-violations" aria-labelledby="inspector-violations-label">
            <span className="inspector-violations-label" id="inspector-violations-label">Constraint Violations</span>
            {rData.violations.map((violation: ConstraintViolation, idx: number) => (
              <div
                key={idx}
                className="inspector-violation-card"
              >
                <div className="inspector-violation-header">
                  <strong className="inspector-violation-code">{violation.code}</strong>
                  {violation.objectId && (
                    <button
                      type="button"
                      onClick={() => handleJump(violation.objectId)}
                      aria-label={`Jump to ${violation.objectId} definition`}
                      className="inspector-violation-object-link"
                    >
                      {violation.objectId} ↗
                    </button>
                  )}
                </div>
                <p className="inspector-violation-message">{violation.message}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="inspector-content">
      <div className="meta-strip inspector-meta-strip">
        <div className="meta-row inspector-meta-row">
          <div className="meta-chip inspector-meta-chip">
            <span className="meta-label">Example</span>
            <strong>{exampleName}</strong>
          </div>
        </div>
        <div className="meta-row inspector-meta-row">
          <div className="meta-chip inspector-meta-chip">
            <span className="meta-label">Objects</span>
            <strong>{objectCount}</strong>
          </div>
          <div className="meta-chip inspector-meta-chip">
            <span className="meta-label">Values</span>
            <strong>{valueCount}</strong>
          </div>
          <div className="meta-chip inspector-meta-chip">
            <span className="meta-label">Unit</span>
            <strong>{unit}</strong>
          </div>
        </div>
      </div>
      <div
        role="tablist"
        aria-label="Inspector views"
        className="tab-strip inspector-tab-strip"
      >
        <button
          type="button"
          id="inspector-tab-objects"
          role="tab"
          aria-selected={tab === 'resolved'}
          aria-controls="inspector-tabpanel"
          tabIndex={tab === 'resolved' ? 0 : -1}
          className={tab === 'resolved' ? 'active' : ''}
          onClick={() => setTab('resolved')}
          onKeyDown={(event) => handleTabKeyDown(event, 'resolved')}
        >
          Objects
        </button>
        <button
          type="button"
          id="inspector-tab-values"
          role="tab"
          aria-selected={tab === 'values'}
          aria-controls="inspector-tabpanel"
          tabIndex={tab === 'values' ? 0 : -1}
          className={tab === 'values' ? 'active' : ''}
          onClick={() => setTab('values')}
          onKeyDown={(event) => handleTabKeyDown(event, 'values')}
        >
          Values
        </button>
        <button
          type="button"
          id="inspector-tab-errors"
          role="tab"
          aria-selected={tab === 'errors'}
          aria-controls="inspector-tabpanel"
          tabIndex={tab === 'errors' ? 0 : -1}
          className={tab === 'errors' ? 'active' : ''}
          onClick={() => setTab('errors')}
          onKeyDown={(event) => handleTabKeyDown(event, 'errors')}
        >
          Errors
        </button>
        <button
          type="button"
          id="inspector-tab-graph"
          role="tab"
          aria-selected={tab === 'graph'}
          aria-controls="inspector-tabpanel"
          tabIndex={tab === 'graph' ? 0 : -1}
          className={tab === 'graph' ? 'active' : ''}
          onClick={() => setTab('graph')}
          onKeyDown={(event) => handleTabKeyDown(event, 'graph')}
        >
          Graph
        </button>
        <button
          type="button"
          id="inspector-tab-bom"
          role="tab"
          aria-selected={tab === 'bom'}
          aria-controls="inspector-tabpanel"
          tabIndex={tab === 'bom' ? 0 : -1}
          className={tab === 'bom' ? 'active' : ''}
          onClick={() => setTab('bom')}
          onKeyDown={(event) => handleTabKeyDown(event, 'bom')}
        >
          BOM
        </button>
      </div>

      <div
        id="inspector-tabpanel"
        role="tabpanel"
        aria-labelledby={`inspector-tab-${tab === 'resolved' ? 'objects' : tab}`}
        className="inspector-body inspector-panel"
      >
        {tab === 'graph' ? (
          <Suspense fallback={<div className="inspector-tab-loading">Loading dependency graph...</div>}>
            <GraphViewer
              objects={doc?.objects || {}}
              selectedObjectId={selectedObjectId}
              relatedObjectIds={relatedObjectIds}
              onNodeSelect={(nodeId) => {
                setExpandedObjects((prev) => ({ ...prev, [nodeId]: true }));
                setTab('resolved');
                handleJump(nodeId);
              }}
            />
          </Suspense>
        ) : tab === 'resolved' ? (
          renderObjectsTab()
        ) : tab === 'values' ? (
          renderValuesTab()
        ) : tab === 'bom' ? (
          renderBomTab()
        ) : (
          renderErrorsTab()
        )}
      </div>
    </div>
  );
}
