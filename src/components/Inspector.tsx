import { useEffect, useState, lazy, Suspense } from 'react';
import { ICONS } from './Icons';
import type { InspectorTab } from '../types';
import type { RelGeoDocument, ResolvedScene, RelGeoError, ResolvedObject, PathResolvedSegment, ConstraintViolation } from '@relgeo/core';
import { getClosedShapeMetricLabel } from '../inspector-helpers';

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
  onSelectObject?: (objectId: string | null) => void;
  onJumpToLine?: (lineNum: number) => void;
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
  onSelectObject,
  onJumpToLine,
}: InspectorProps) {
  const [expandedObjects, setExpandedObjects] = useState<Record<string, boolean>>({});
  const [objectQuery, setObjectQuery] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const toggleExpand = (objectId: string) => {
    onSelectObject?.(objectId);
    setExpandedObjects((prev) => ({ ...prev, [objectId]: !prev[objectId] }));
  };

  useEffect(() => {
    if (!selectedObjectId) return;
    setExpandedObjects((prev) => ({ ...prev, [selectedObjectId]: true }));
    if (tab !== 'resolved') {
      setTab('resolved');
    }
  }, [selectedObjectId, setTab, tab]);

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
    if (onJumpToLine) {
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

    const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.74rem' };
    const labelStyle = { color: 'var(--muted)', fontWeight: 500 };
    const valStyle = { fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontWeight: 600 };
    const hintStyle = {
      color: 'var(--muted)',
      fontSize: '0.66rem',
      lineHeight: 1.45,
      marginBottom: '0.35rem',
    };
    const chipWrapStyle = { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'flex-end', maxWidth: '65%' };
    const chipStyle = {
      fontSize: '0.64rem',
      borderRadius: '999px',
      padding: '0.12rem 0.38rem',
      background: 'var(--panel-strong)',
      border: '1px solid var(--line)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
    };

    return (
      <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--line)', paddingTop: '0.5rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
          Metadata
        </span>
        <div style={hintStyle}>
          Resolved values are shown below together with source hints from the current object declaration.
        </div>
        {role && (
          <div style={rowStyle}>
            <span style={labelStyle}>Resolved Role</span>
            <span style={valStyle}>{role}</span>
          </div>
        )}
        {intent && (
          <div style={rowStyle}>
            <span style={labelStyle}>Resolved Intent</span>
            <span style={valStyle}>{intent}</span>
          </div>
        )}
        {label && (
          <div style={rowStyle}>
            <span style={labelStyle}>Resolved Label</span>
            <span style={valStyle}>{label}</span>
          </div>
        )}
        {presetName && (
          <div style={rowStyle}>
            <span style={labelStyle}>Preset Ref</span>
            <span style={valStyle}>{presetName}</span>
          </div>
        )}
        {inheritText && (
          <div style={rowStyle}>
            <span style={labelStyle}>Inherit Ref</span>
            <span style={{ ...valStyle, textAlign: 'right' }}>{inheritText}</span>
          </div>
        )}
        {(presetName || inheritText || localMetaKeys.length > 0) && (
          <div style={rowStyle}>
            <span style={labelStyle}>Source Order</span>
            <span style={{ ...valStyle, textAlign: 'right' }}>
              metaPreset -&gt; inherit -&gt; local meta
            </span>
          </div>
        )}
        {localMetaKeys.length > 0 && (
          <div style={rowStyle}>
            <span style={labelStyle}>Local Meta Keys</span>
            <div style={chipWrapStyle}>
              {localMetaKeys.map((key) => (
                <span key={key} style={chipStyle}>
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
                    <code 
                      key={cid} 
                      onClick={() => toggleExpand(cid)}
                      style={{ fontSize: '0.64rem', background: 'var(--brand-soft)', color: 'var(--brand)', padding: '0.1rem 0.3rem', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {cid}
                    </code>
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
                    <code 
                      key={cid} 
                      onClick={() => toggleExpand(cid)}
                      style={{ fontSize: '0.64rem', background: 'var(--brand-soft)', color: 'var(--brand)', padding: '0.1rem 0.3rem', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {cid.replace(`${obj.id}.`, '')}
                    </code>
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
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <div className="inspector-filter" style={{ display: 'grid', gap: '0.4rem', padding: '0 0 0.65rem' }}>
          <label htmlFor="inspector-object-filter" style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700 }}>
            Find object
          </label>
          <input
            id="inspector-object-filter"
            type="search"
            value={objectQuery}
            onChange={(event) => setObjectQuery(event.target.value)}
            placeholder="Name or type…"
            aria-label="Find object by name or type"
            style={{ width: '100%', minWidth: 0 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={showSelectedOnly}
              onChange={(event) => setShowSelectedOnly(event.target.checked)}
              aria-label="Show selected object only"
            />
            Selected only
          </label>
          <span role="status" aria-live="polite" style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
            Showing {objectEntries.length} of {Object.keys(rData.objects).length} objects
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        {objectEntries.map(([id, obj]: [string, ResolvedObject]) => {
          const isExpanded = !!expandedObjects[id];
          return (
            <div
              key={id}
              style={{
                background: isExpanded ? 'var(--panel-strong)' : 'rgba(255, 255, 255, 0.4)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '0.5rem 0.65rem',
                transition: 'all 150ms ease',
                boxShadow: isExpanded ? '0 4px 12px rgba(60, 44, 10, 0.04)' : 'none',
              }}
            >
              {/* Header Card */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleExpand(id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} object ${id}`}
                    aria-expanded={isExpanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleExpand(id);
                    }}
                    style={{ border: 'none', background: 'transparent', padding: 0, width: '16px', height: '16px', color: 'var(--muted)' }}
                  >
                    {isExpanded ? ICONS.ChevronUp : ICONS.ChevronDown}
                  </button>
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{id}</strong>
                    <span
                      style={{
                        marginLeft: '0.4rem',
                        fontSize: '0.62rem',
                        textTransform: 'uppercase',
                        padding: '0.12rem 0.32rem',
                        borderRadius: '4px',
                        background: 'var(--brand-soft)',
                        color: 'var(--brand)',
                        fontWeight: 700,
                      }}
                    >
                      {obj.type}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleJump(id)}
                    title="Jump to code definition"
                    style={{
                      border: 'none',
                      background: 'var(--brand-soft)',
                      color: 'var(--brand)',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      padding: 0,
                    }}
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
                <div style={{ marginTop: '0.4rem', animation: 'fadeIn 0.2s ease-out' }}>
                  {renderGeometryDetails(obj)}
                  {renderMetadataDetails(id, obj)}

                  {/* Render Anchors if they exist */}
                  {obj.anchors && Object.keys(obj.anchors).length > 0 && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--line)', paddingTop: '0.5rem' }}>
                      <span style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Anchors</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                        {Object.entries(obj.anchors).map(([anchorName, anchorVal]) => (
                          <div
                            key={anchorName}
                            style={{
                              padding: '0.25rem 0.4rem',
                              background: 'rgba(0, 0, 0, 0.02)',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <span style={{ color: 'var(--muted)' }}>{anchorName}</span>
                            <span style={{ fontWeight: 600 }}>
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
                </div>
              )}
            </div>
          );
        })}
        {objectEntries.length === 0 && (
          <div style={{ padding: '1rem 0.4rem', color: 'var(--muted)', fontSize: '0.76rem' }}>
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
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
          No parameters or derived scalar values resolved.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        {Object.entries(values).map(([key, val]) => (
          <div
            key={key}
            style={{
              padding: '0.45rem 0.6rem',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: '6px',
            }}
          >
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
      const rowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.15rem 0',
        fontSize: '0.74rem',
        fontFamily: 'var(--font-mono)',
      };
      return (
        <div style={rowStyle}>
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontWeight: 700, color: 'var(--brand)' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.74rem', padding: '0.1rem 0' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span style={{ color: 'var(--muted)', fontSize: '0.55rem', width: '10px', display: 'inline-block' }}>
            {isOpen ? '▼' : '▶'}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{label}</span>
          <span style={{ fontSize: '0.55rem', color: 'var(--brand)', background: 'var(--brand-soft)', padding: '0.02rem 0.2rem', borderRadius: '3px', fontWeight: 'bold' }}>{typeLabel}</span>
        </div>
        {isOpen && (
          <div style={{ paddingLeft: '0.8rem', borderLeft: '1px dashed var(--line)', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        <div style={{ padding: '0.65rem 0.8rem', background: 'var(--brand-soft)', border: '1px solid var(--line)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase' }}>Total Cut Length</span>
            <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{totalCutLength.toFixed(2)} {unit}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase' }}>Material Area</span>
            <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{totalArea.toFixed(2)} {unit}²</strong>
          </div>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
            <thead>
              <tr style={{ background: 'var(--panel-strong)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '0.5rem 0.6rem', color: 'var(--muted)', fontWeight: 600 }}>Part Item</th>
                <th style={{ padding: '0.5rem 0.6rem', color: 'var(--muted)', fontWeight: 600, textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.5rem 0.6rem', color: 'var(--muted)', fontWeight: 600 }}>Specs</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bomMap).map(([partName, item]) => (
                <tr key={partName} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600, color: 'var(--ink)' }}>{partName}</td>
                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 700, color: 'var(--brand)' }}>{item.count}</td>
                  <td style={{ padding: '0.5rem 0.6rem', color: 'var(--muted)' }}>{item.details}</td>
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

    if (!rError && !hasViolations) {
      return (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--ready)', fontSize: '0.8rem', fontWeight: 'bold' }}>
          ✨ No errors or constraint violations detected!
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
        {rError && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: '0.85rem',
              background: 'var(--error-soft)',
              border: '1px solid rgba(194, 65, 12, 0.2)',
              borderRadius: '6px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--error)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Error Code: {rError.path ? 'VALIDATION_FAILED' : 'COMPILE_ERROR'}
              </span>
              {rError.objectId && (
                <button
                  type="button"
                  onClick={() => handleJump(rError.objectId!)}
                  aria-label={`Jump to object ${rError.objectId} definition`}
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    background: '#fff7ed',
                    color: '#9a3412',
                    padding: '0.12rem 0.32rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                  title="Jump to object definition"
                >
                  obj: {rError.objectId} ↗
                </button>
              )}
            </div>
            <p style={{ margin: '0 0 0.5rem', color: 'var(--error)', fontSize: '0.76rem', fontWeight: 600, lineHeight: 1.4 }}>
              {rError.message}
            </p>

            {rError.dependencyChain && rError.dependencyChain.length > 0 && (
              <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.5rem', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Circular Dependency Chain</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem' }}>
                  {rError.dependencyChain.map((node: string, idx: number) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => handleJump(node)}
                        aria-label={`Jump to ${node} definition`}
                        style={{
                          fontSize: '0.7rem',
                          background: 'white',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '4px',
                          border: '1px solid var(--line)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {node}
                      </button>
                      {idx < rError.dependencyChain.length - 1 && <span style={{ color: 'var(--muted)' }}>→</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {hasViolations && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Constraint Violations</span>
            {rData.violations.map((violation: ConstraintViolation, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '0.65rem 0.8rem',
                  background: 'var(--accent-soft)',
                  border: '1px solid rgba(217, 119, 6, 0.2)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <strong style={{ fontSize: '0.74rem', color: 'var(--accent)' }}>{violation.code}</strong>
                  {violation.objectId && (
                    <button
                      type="button"
                      onClick={() => handleJump(violation.objectId)}
                      aria-label={`Jump to ${violation.objectId} definition`}
                      style={{ fontSize: '0.68rem', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {violation.objectId} ↗
                    </button>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--ink)' }}>{violation.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="inspector-content">
      <div className="meta-strip" style={{ padding: '0 0 1rem', borderBottom: '1px solid var(--line)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="meta-row" style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="meta-chip" style={{ minWidth: 'auto', flex: 1, padding: '0.4rem 0.6rem' }}>
            <span className="meta-label">Example</span>
            <strong style={{ fontSize: '0.8rem' }}>{exampleName}</strong>
          </div>
        </div>
        <div className="meta-row" style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="meta-chip" style={{ minWidth: 'auto', flex: 1, padding: '0.4rem 0.6rem' }}>
            <span className="meta-label">Objects</span>
            <strong style={{ fontSize: '0.8rem' }}>{objectCount}</strong>
          </div>
          <div className="meta-chip" style={{ minWidth: 'auto', flex: 1, padding: '0.4rem 0.6rem' }}>
            <span className="meta-label">Values</span>
            <strong style={{ fontSize: '0.8rem' }}>{valueCount}</strong>
          </div>
          <div className="meta-chip" style={{ minWidth: 'auto', flex: 1, padding: '0.4rem 0.6rem' }}>
            <span className="meta-label">Unit</span>
            <strong style={{ fontSize: '0.8rem' }}>{unit}</strong>
          </div>
        </div>
      </div>
      <div
        className="tab-strip"
        role="tablist"
        aria-label="Inspector views"
        style={{ padding: '0.25rem 0 0.75rem', borderBottom: '1px solid var(--line)', marginBottom: '0.75rem' }}
      >
        <button
          type="button"
          id="inspector-tab-objects"
          role="tab"
          aria-selected={tab === 'resolved'}
          aria-controls="inspector-tabpanel"
          className={tab === 'resolved' ? 'active' : ''}
          onClick={() => setTab('resolved')}
        >
          Objects
        </button>
        <button
          type="button"
          id="inspector-tab-values"
          role="tab"
          aria-selected={tab === 'values'}
          aria-controls="inspector-tabpanel"
          className={tab === 'values' ? 'active' : ''}
          onClick={() => setTab('values')}
        >
          Values
        </button>
        <button
          type="button"
          id="inspector-tab-errors"
          role="tab"
          aria-selected={tab === 'errors'}
          aria-controls="inspector-tabpanel"
          className={tab === 'errors' ? 'active' : ''}
          onClick={() => setTab('errors')}
        >
          Errors
        </button>
        <button
          type="button"
          id="inspector-tab-graph"
          role="tab"
          aria-selected={tab === 'graph'}
          aria-controls="inspector-tabpanel"
          className={tab === 'graph' ? 'active' : ''}
          onClick={() => setTab('graph')}
        >
          Graph
        </button>
        <button
          type="button"
          id="inspector-tab-bom"
          role="tab"
          aria-selected={tab === 'bom'}
          aria-controls="inspector-tabpanel"
          className={tab === 'bom' ? 'active' : ''}
          onClick={() => setTab('bom')}
        >
          BOM
        </button>
      </div>

      <div
        id="inspector-tabpanel"
        role="tabpanel"
        aria-labelledby={`inspector-tab-${tab === 'resolved' ? 'objects' : tab}`}
        className="inspector-body"
        style={{ minHeight: '300px', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}
      >
        {tab === 'graph' ? (
          <Suspense fallback={<div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>Loading dependency graph...</div>}>
            <GraphViewer
              objects={doc?.objects || {}}
              selectedObjectId={selectedObjectId}
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
