import { useRef, useEffect, useState, type PointerEventHandler, type WheelEventHandler } from 'react';
import { applyTransformPipeline, getObjectBoundingBox, calculateBoundingBox } from '@relgeo/core';
import type { ConstraintViolation, ResolvedScene, ResolvedObject, ResolvedPath, ResolvedPolygon, ResolvedDimension, ResolvedAnnotation, ResolvedTransform } from '@relgeo/core';
import type { DragState, OverlayConfig, PreviewLineMode } from '../types';
import { ICONS } from './Icons';
import { getPreviewToolbarHint, getPreviewToolbarLabel, getPreviewToolbarMode } from '../preview-toolbar';
import {
  computePreviewScreenScale,
  computeFitZoomPercent,
  formatPreviewFrameCssLength,
  getPreviewFrameSize,
} from '../preview-geometry';

interface PreviewProps {
  svgContent: string;
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  onExport: () => void;
  exampleName: string;
  objectCount: number;
  valueCount: number;
  unit: string;
  error: string | null;
  errorPath: string | null;
  errorHint?: string | null;
  fullError?: unknown;
  violations?: ConstraintViolation[];
  dragState: DragState;
  setDragState: (state: DragState) => void;
  resolvedData?: ResolvedScene;
  showDimensions: boolean;
  setShowDimensions: (val: boolean) => void;
  showAnnotations: boolean;
  setShowAnnotations: (val: boolean) => void;
  showAnchors: boolean;
  setShowAnchors: (val: boolean) => void;
  showLabels: boolean;
  setShowLabels: (val: boolean) => void;
  showBoundingBox: boolean;
  setShowBoundingBox: (val: boolean) => void;
  isPrintMode: boolean;
  previewLineMode: PreviewLineMode;
  setPreviewLineMode: (mode: PreviewLineMode) => void;
  staticPreviewStrokePx: number;
  hiddenRoles?: Set<string>;
  fitAllTrigger: number;
  selectedSheetId: string | null;
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string | null) => void;
}

export function Preview({
  svgContent,
  zoom,
  setZoom,
  pan,
  setPan,
  error,
  errorPath,
  errorHint,
  fullError,
  dragState,
  setDragState,
  resolvedData,
  showDimensions,
  setShowDimensions,
  showAnnotations,
  setShowAnnotations,
  showAnchors,
  setShowAnchors,
  showLabels,
  setShowLabels,
  showBoundingBox,
  setShowBoundingBox,
  isPrintMode,
  previewLineMode,
  setPreviewLineMode,
  staticPreviewStrokePx,
  hiddenRoles,
  fitAllTrigger,
  selectedSheetId,
  selectedObjectId = null,
  onSelectObject,
}: PreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const toolbarMode = getPreviewToolbarMode(isPrintMode);
  const previewLabel = getPreviewToolbarLabel(toolbarMode);
  const previewHint = getPreviewToolbarHint(toolbarMode, selectedSheetId);
  
  // Custom overlay settings state
  const [overlay, setOverlay] = useState<OverlayConfig>({
    showAnchors: true,
    showBoundingBoxes: false,
    showLabels: true,
    showSegments: false,
  });

  // State to track hovered anchor/object
  const [hoveredAnchor, setHoveredAnchor] = useState<{ objectId: string; name: string; x: number; y: number } | null>(null);

  const setZoomClamped = (nextZoom: number) => {
    const clamped = Math.min(10000, Math.max(0.01, Math.round(nextZoom * 100) / 100));
    setZoom(clamped);
  };

  const handleWheelZoom: WheelEventHandler<HTMLDivElement> = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoomClamped(zoom + (event.deltaY < 0 ? 10 : -10));
  };

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    // Prevent dragging if clicking overlay elements
    const target = event.target as SVGElement;
    if (target.closest('.overlay-interactive')) return;

    if (!svgContent) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    });
  };

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragState) return;
    setPan({
      x: dragState.originX - (event.clientX - dragState.startX),
      y: dragState.originY - (event.clientY - dragState.startY),
    });
  };

  const handlePointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  };

  // Sync pan with scroll
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scrollLeft = pan.x;
      stageRef.current.scrollTop = pan.y;
    }
  }, [pan.x, pan.y]);

  useEffect(() => {
    if (isPrintMode || !stageRef.current || !resolvedData || !svgContent) return;

    const stage = stageRef.current;
    const strokeNodes = Array.from(
      stage.querySelectorAll<SVGElement>('.svg-inner-wrapper [data-preview-stroke="visible"]')
    );

    if (strokeNodes.length === 0) return;

    const logicalFrame = getPreviewFrameSize(resolvedData, selectedSheetId, 'logical');
    const physicalFrame = getPreviewFrameSize(resolvedData, selectedSheetId, 'physical');
    const screenScale = computePreviewScreenScale(logicalFrame, physicalFrame, 100);
    if (!screenScale) return;

    const sceneUnitToCssPxAt100 = screenScale.pxPerSceneUnit;
    const safeStaticStrokePx = staticPreviewStrokePx > 0 ? staticPreviewStrokePx : 1;

    for (const node of strokeNodes) {
      const source = node.getAttribute('data-preview-stroke-source');
      const baseStrokeWidth = Number(node.getAttribute('data-preview-stroke-width') ?? '0');

      let targetScreenPx = safeStaticStrokePx;
      if (previewLineMode === 'physical-relative' && source === 'explicit' && baseStrokeWidth > 0) {
        targetScreenPx = baseStrokeWidth * sceneUnitToCssPxAt100;
      }

      node.style.strokeWidth = `${targetScreenPx}px`;
      node.style.vectorEffect = 'non-scaling-stroke';
    }
  }, [isPrintMode, previewLineMode, resolvedData, selectedSheetId, staticPreviewStrokePx, svgContent, zoom]);

  useEffect(() => {
    if (!selectedObjectId || !stageRef.current || !svgContent) return;

    const stage = stageRef.current;
    let frame1 = 0;
    let frame2 = 0;

    const focusSelectedObject = () => {
      const overlayNodes = Array.from(
        stage.querySelectorAll<SVGGElement>('[data-overlay-object-id]')
      );
      const targetNode = overlayNodes.find(
        (node) => node.getAttribute('data-overlay-object-id') === selectedObjectId
      );
      if (!targetNode) return;

      const stageRect = stage.getBoundingClientRect();
      const targetRect = targetNode.getBoundingClientRect();
      if (targetRect.width === 0 && targetRect.height === 0) return;

      const targetCenterX = targetRect.left - stageRect.left + stage.scrollLeft + targetRect.width / 2;
      const targetCenterY = targetRect.top - stageRect.top + stage.scrollTop + targetRect.height / 2;

      const maxPanX = Math.max(0, stage.scrollWidth - stage.clientWidth);
      const maxPanY = Math.max(0, stage.scrollHeight - stage.clientHeight);
      const nextPanX = Math.min(maxPanX, Math.max(0, targetCenterX - stage.clientWidth / 2));
      const nextPanY = Math.min(maxPanY, Math.max(0, targetCenterY - stage.clientHeight / 2));

      if (Math.abs(nextPanX - stage.scrollLeft) > 2 || Math.abs(nextPanY - stage.scrollTop) > 2) {
        setPan({ x: nextPanX, y: nextPanY });
      }
    };

    frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(focusSelectedObject);
    });

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, [selectedObjectId, selectedSheetId, setPan, svgContent, zoom]);

  // Handle auto "fit all" triggered by props
  useEffect(() => {
    if (stageRef.current) {
      const containerWidth = stageRef.current.clientWidth - 40;
      const containerHeight = stageRef.current.clientHeight - 40;
      // Both model preview and print-oriented preview fit against the physical
      // frame; their difference is in presentation policy, not geometry basis.
      const frame = getPreviewFrameSize(resolvedData, selectedSheetId, 'physical');
      const fitZoom = computeFitZoomPercent(frame, containerWidth, containerHeight);

      if (fitZoom !== null) {
        setZoom(fitZoom);
        setPan({ x: 0, y: 0 });
        if (stageRef.current) {
          stageRef.current.scrollLeft = 0;
          stageRef.current.scrollTop = 0;
        }
      }
    }
  }, [fitAllTrigger, isPrintMode, resolvedData, selectedSheetId, setPan, setZoom]);

  const getBoundingBox = (id: string, obj: ResolvedObject, parentMap?: Map<string, string>) => {
    if (!obj || !obj.type) return null;
    if (obj.type === 'dimension' || obj.type === 'annotation') return null;
    try {
      const bbox = getObjectBoundingBox(id, resolvedData!.objects, { ignoreRoles: hiddenRoles ? Array.from(hiddenRoles) : undefined }, parentMap);
      if (obj.type === 'point') {
        return { x: bbox.x - 2, y: bbox.y - 2, width: 4, height: 4 };
      }
      return bbox;
    } catch {
      return null;
    }
  };

  const getLabelPosition = (obj: ResolvedObject) => {
    if (!obj) return null;

    if (obj.type === 'point') {
      if (typeof obj.x !== 'number' || typeof obj.y !== 'number') return null;
      return { x: obj.x, y: obj.y - 8 };
    }
    if (obj.type === 'circle' || obj.type === 'rect' || obj.type === 'arc') {
      if (!obj.center || typeof obj.center.x !== 'number' || typeof obj.center.y !== 'number') return null;
      return { x: obj.center.x, y: obj.center.y };
    }
    if (obj.type === 'line') {
      if (!obj.start || !obj.end || typeof obj.start.x !== 'number' || typeof obj.start.y !== 'number' || typeof obj.end.x !== 'number' || typeof obj.end.y !== 'number') return null;
      return { x: (obj.start.x + obj.end.x) / 2, y: (obj.start.y + obj.end.y) / 2 - 6 };
    }
    if (obj.type === 'path' || obj.type === 'polygon') {
      if (obj.segments && obj.segments.length > 0 && obj.segments[0] && typeof obj.segments[0].x2 === 'number' && typeof obj.segments[0].y2 === 'number') {
        return { x: obj.segments[0].x2, y: obj.segments[0].y2 - 10 };
      }
    }
    return null;
  };

  const getAbsoluteLabelPosition = (id: string, obj: ResolvedObject, objectsMap: Record<string, ResolvedObject>, parentMap: Map<string, string>) => {
    const localPos = getLabelPosition(obj);
    if (!localPos) return null;
    
    let currentId: string | undefined = id;
    const accumulated: ResolvedTransform = [];
    while (currentId) {
      const currentObj = objectsMap[currentId];
      if (currentObj && currentObj.transform && currentObj.transform.length > 0) {
        accumulated.push(...currentObj.transform);
      }
      currentId = parentMap.get(currentId);
    }
    
    if (accumulated.length === 0) return localPos;
    return applyTransformPipeline(localPos, accumulated);
  };

  const getObjectAnchors = (obj: ResolvedObject): Record<string, { x: number, y: number }> => {
    const anchors: Record<string, { x: number, y: number }> = {};
    if (obj.type === "rect") {
      anchors["topLeft"] = { x: obj.x as number, y: obj.y as number };
      anchors["topRight"] = { x: (obj.x as number) + (obj.width as number), y: obj.y as number };
      anchors["bottomLeft"] = { x: obj.x as number, y: (obj.y as number) + (obj.height as number) };
      anchors["bottomRight"] = { x: (obj.x as number) + (obj.width as number), y: (obj.y as number) + (obj.height as number) };
      anchors["center"] = { x: (obj.x as number) + (obj.width as number) / 2, y: (obj.y as number) + (obj.height as number) / 2 };
    } else if (obj.type === "line") {
      anchors["start"] = { x: obj.x1 as number, y: obj.y1 as number };
      anchors["end"] = { x: obj.x2 as number, y: obj.y2 as number };
      anchors["center"] = { x: ((obj.x1 as number) + (obj.x2 as number)) / 2, y: ((obj.y1 as number) + (obj.y2 as number)) / 2 };
    } else if (obj.type === "circle" || obj.type === "arc") {
      if (typeof obj.cx === 'number' && typeof obj.cy === 'number') {
        anchors["center"] = { x: obj.cx, y: obj.cy };
      }
    } else if (obj.type === "point") {
      anchors["center"] = { x: obj.x as number, y: obj.y as number };
    }

    if (obj.anchors) {
      for (const [name, pos] of Object.entries(obj.anchors)) {
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          anchors[name] = { x: pos.x, y: pos.y };
        }
      }
    }
    return anchors;
  };

  // Helper to render visual overlay SVG
  const renderOverlayLayer = () => {
    const rData = resolvedData;
    if (!rData || !rData.bbox || !rData.objects) return null;

    const padding = rData.padding ?? 20;
    const { x: minX, y: minY, width, height } = rData.bbox || { x: 0, y: 0, width: 100, height: 100 };

    let dx = 0;
    let dy = 0;
    const origin = rData.origin || "top-left";

    if (origin === "bottom-left") {
      dy = -(minY + height);
    } else if (origin === "center") {
      dx = -(minX + width / 2);
      dy = -(minY + height / 2);
    }

    const adjustedMinX = minX + dx;
    const adjustedMinY = minY + dy;
    const viewBox = `${adjustedMinX - padding} ${adjustedMinY - padding} ${width + padding * 2} ${height + padding * 2}`;

    let orientationAttr = "";
    if (rData.orientation === "y-up") {
      orientationAttr = "scale(1, -1)";
    }

    const sceneTransform = [
      dx || dy ? `translate(${dx}, ${dy})` : "",
      orientationAttr
    ].filter(Boolean).join(" ");

    if (isPrintMode) return null;

    const logicalFrame = getPreviewFrameSize(rData, selectedSheetId, 'logical');
    const physicalFrame = getPreviewFrameSize(rData, selectedSheetId, 'physical');
    const screenScale = computePreviewScreenScale(logicalFrame, physicalFrame, zoom);
    if (!screenScale) return null;

    // Overlay primitives are authored in "screen-ish" units and then converted back
    // into scene units so they remain visually stable on screen.
    const s = screenScale.sceneUnitsPerPx;

    const parentMap = new Map<string, string>();
    if (rData.objects) {
      for (const [id, obj] of Object.entries(rData.objects)) {
        if (obj.children && Array.isArray(obj.children)) {
          for (const childId of obj.children) {
            parentMap.set(childId, id);
          }
        }
      }
    }

    const renderObjects = (objectsMap: Record<string, ResolvedObject>, groupTransform: string) => (
      <g transform={groupTransform}>
        {Object.entries(objectsMap).map(([id, obj]: [string, ResolvedObject]) => {
            if (obj.meta?.visible === false) return null;

            // Pass parentMap to getBoundingBox so it uses the world-space bounding box
            const bbox = getBoundingBox(id, obj, parentMap);
            const labelPos = getAbsoluteLabelPosition(id, obj, objectsMap, parentMap);
            
            return (
              <g key={id} data-overlay-object-id={id}>
                {/* Bounding box layer */}
                {overlay.showBoundingBoxes && bbox && (
                  <rect
                    x={bbox.x}
                    y={bbox.y}
                    width={bbox.width}
                    height={bbox.height}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={0.75 * s}
                    strokeDasharray={`${2 * s},${2 * s}`}
                    opacity="0.6"
                  />
                )}

                {selectedObjectId === id && bbox && (
                  <g className="overlay-interactive" style={{ pointerEvents: 'none' }}>
                    <rect
                      x={bbox.x}
                      y={bbox.y}
                      width={bbox.width}
                      height={bbox.height}
                      fill="rgba(251, 191, 36, 0.08)"
                      stroke="var(--brand)"
                      strokeWidth={1.4 * s}
                      strokeDasharray={`${3 * s},${2 * s}`}
                      opacity="0.95"
                    />
                    <circle
                      cx={bbox.x + bbox.width / 2}
                      cy={bbox.y + bbox.height / 2}
                      r={1.8 * s}
                      fill="var(--brand)"
                      opacity="0.95"
                    />
                  </g>
                )}

                {/* Path Segment indices */}
                {overlay.showSegments && (obj.type === 'path' || obj.type === 'polygon') && (obj as ResolvedPath | ResolvedPolygon).segments && (
                  <g>
                    {((obj as ResolvedPath | ResolvedPolygon).segments || []).map((seg, idx) => {
                      const x1 = seg.x1;
                      const y1 = seg.y1;
                      const x2 = seg.x2;
                      const y2 = seg.y2;

                      if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') {
                        return null;
                      }

                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      
                      return (
                        <g key={idx} transform={`translate(${midX}, ${midY}) scale(${s})`}>
                          <circle cx={0} cy={0} r="3.5" fill="var(--ink)" />
                          <g transform={rData.orientation === 'y-up' ? 'scale(1, -1)' : ''}>
                            <text
                              x={0}
                              y={1.2}
                              fontSize="3"
                              fontFamily="var(--font-mono)"
                              fill="white"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {idx}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Anchors layer */}
                {overlay.showAnchors && (
                  <g>
                    {Object.entries(getObjectAnchors(obj)).map(([anchorName, anchorVal]) => {
                      if (!anchorVal || typeof anchorVal !== 'object') return null;
                      let { x, y } = anchorVal;
                      
                      let currentId: string | undefined = id;
                      const accumulated: ResolvedTransform = [];
                      while (currentId) {
                        const currentObj = objectsMap[currentId];
                        if (currentObj && currentObj.transform && currentObj.transform.length > 0) {
                          accumulated.push(...currentObj.transform);
                        }
                        currentId = parentMap.get(currentId);
                      }
                      
                      if (accumulated.length > 0) {
                        const worldPos = applyTransformPipeline({ x, y }, accumulated);
                        x = worldPos.x;
                        y = worldPos.y;
                      }

                      return (
                        <g
                          key={anchorName}
                          className="overlay-interactive"
                          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                          onPointerOver={() => setHoveredAnchor({ objectId: id, name: anchorName, x, y })}
                          onPointerOut={() => setHoveredAnchor(null)}
                          transform={`translate(${x}, ${y}) scale(${s})`}
                        >
                          {/* Crosshairs & Center target */}
                          <line x1={-2.5} y1={0} x2={2.5} y2={0} stroke="var(--brand)" strokeWidth="0.5" />
                          <line x1={0} y1={-2.5} x2={0} y2={2.5} stroke="var(--brand)" strokeWidth="0.5" />
                          <circle cx={0} cy={0} r="1" fill="white" stroke="var(--brand)" strokeWidth="0.4" />
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Text labels layer */}
                {overlay.showLabels && labelPos && (
                  <g 
                    transform={`translate(${labelPos.x}, ${labelPos.y})${rData.orientation === 'y-up' ? ' scale(1, -1)' : ''} scale(${s})`}
                    className="overlay-interactive"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onSelectObject?.(id);
                    }}
                  >
                    <rect
                      x={-(id.length * 1.2 + 2)}
                      y={-3.2}
                      width={id.length * 2.4 + 4}
                      height={4}
                      rx="1"
                      fill={selectedObjectId === id ? 'var(--brand)' : 'var(--ink)'}
                      stroke={selectedObjectId === id ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.2)'}
                      strokeWidth={0.3}
                      opacity={selectedObjectId === id ? '0.95' : '0.75'}
                    />
                    <text
                      x={0}
                      y={-0.3}
                      fontSize="2.2"
                      fontFamily="var(--font-mono)"
                      fill="white"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {id}
                    </text>
                  </g>
                )}

                {/* Dimensions Overlay */}
                {showDimensions && obj.type === 'dimension' && (
                  <g className="overlay-interactive" style={{ pointerEvents: 'none' }}>
                    {(() => {
                      const dim = obj as ResolvedDimension;
                      if (dim.kind === 'linear' && dim.from && dim.to) {
                        const from = dim.from;
                        const to = dim.to;
                        const offset = dim.offset || 10;
                        
                        const dx = to.x - from.x;
                        const dy = to.y - from.y;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        const nx = -dy / len;
                        const ny = dx / len;
                        
                        const p1 = { x: from.x + nx * offset, y: from.y + ny * offset };
                        const p2 = { x: to.x + nx * offset, y: to.y + ny * offset };
                        
                        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        if (rData.orientation === 'y-up') angle = -angle; // Flip text rotation for y-up
                        
                        const textRot = angle > 90 || angle < -90 ? angle + 180 : angle;
                        const textDY = angle > 90 || angle < -90 ? 2 * s : -1 * s;
                        
                        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                        
                        return (
                          <g stroke="var(--brand)" fill="var(--brand)" strokeWidth={0.5 * s}>
                            <line x1={from.x} y1={from.y} x2={p1.x + nx * 2 * s} y2={p1.y + ny * 2 * s} strokeWidth={0.25 * s} strokeDasharray={`${s},${s}`} />
                            <line x1={to.x} y1={to.y} x2={p2.x + nx * 2 * s} y2={p2.y + ny * 2 * s} strokeWidth={0.25 * s} strokeDasharray={`${s},${s}`} />
                            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
                            <circle cx={p1.x} cy={p1.y} r={0.8 * s} />
                            <circle cx={p2.x} cy={p2.y} r={0.8 * s} />
                            <g transform={`translate(${mid.x}, ${mid.y})${rData.orientation === 'y-up' ? ' scale(1, -1)' : ''} rotate(${textRot}) scale(${s})`}>
                              <text
                                x={0} y={textDY / s}
                                textAnchor="middle"
                                fontSize="3"
                                fontFamily="var(--font-mono)"
                                fontWeight="600"
                                fill="var(--brand)"
                                stroke="var(--panel-strong)"
                                strokeWidth="0.8"
                                paintOrder="stroke"
                              >
                                {dim.text}
                              </text>
                            </g>
                          </g>
                        );
                      } else if ((dim.kind === 'radius' || dim.kind === 'diameter') && dim.target && rData.objects[dim.target]) {
                        const targetObj = rData.objects[dim.target] as ResolvedObject & {
                          cx?: number;
                          cy?: number;
                          radius?: number;
                          r?: number;
                          center?: { x: number; y: number };
                        };
                        const cx = targetObj.cx ?? targetObj.center?.x ?? 0;
                        const cy = targetObj.cy ?? targetObj.center?.y ?? 0;
                        const r = targetObj.radius ?? targetObj.r ?? 20;

                        const angleRad = 45 * Math.PI / 180;
                        const ux = Math.cos(angleRad);
                        const uy = Math.sin(angleRad);
                        
                        const px = cx + r * ux;
                        const py = cy + r * uy;
                        const textX = px + 10 * ux;
                        const textY = py + 10 * uy;
                        const elbowX = textX + 15 * s;

                        return (
                          <g stroke="var(--brand)" fill="var(--brand)" strokeWidth={0.5 * s}>
                            <line x1={dim.kind === 'radius' ? cx : cx - r * ux} y1={dim.kind === 'radius' ? cy : cy - r * uy} x2={px} y2={py} />
                            <circle cx={px} cy={py} r={0.8 * s} />
                            {dim.kind === 'diameter' && <circle cx={cx - r * ux} cy={cy - r * uy} r={0.8 * s} />}
                            <path d={`M ${px} ${py} L ${textX} ${textY} L ${elbowX} ${textY}`} fill="none" strokeWidth={0.5 * s} />
                            <g transform={`translate(${elbowX + 2*s}, ${textY})${rData.orientation === 'y-up' ? ' scale(1, -1)' : ''} scale(${s})`}>
                              <text x={0} y={0} textAnchor="start" alignmentBaseline="middle" fontSize="3" fontFamily="var(--font-mono)" fontWeight="600" fill="var(--brand)" stroke="var(--panel-strong)" strokeWidth="0.8" paintOrder="stroke">{dim.text}</text>
                            </g>
                          </g>
                        );
                      }
                      return null;
                    })()}
                  </g>
                )}

                {/* Annotations Overlay */}
                {showAnnotations && obj.type === 'annotation' && (
                  <g className="overlay-interactive" style={{ pointerEvents: 'none' }}>
                    {(() => {
                      const ann = obj as ResolvedAnnotation;
                      if (!ann.leader) return null;
                      
                      const { from, to } = ann.leader;
                      
                      return (
                        <g stroke="var(--accent)" fill="var(--accent)" strokeWidth={0.5 * s}>
                          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                          <circle cx={from.x} cy={from.y} r={0.8 * s} />
                          <g transform={`translate(${to.x}, ${to.y})${rData.orientation === 'y-up' ? ' scale(1, -1)' : ''} scale(${s})`}>
                            <text
                              x={to.x > from.x ? 2 : -2}
                              y={0}
                              textAnchor={to.x > from.x ? "start" : "end"}
                              alignmentBaseline="middle"
                              fontSize="3"
                              fontFamily="var(--font-sans)"
                              fontWeight="600"
                              fill="var(--accent)"
                              stroke="var(--panel-strong)"
                              strokeWidth="0.8"
                              paintOrder="stroke"
                            >
                              {ann.text}
                            </text>
                          </g>
                        </g>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}

        {hoveredAnchor && (
          <g transform={`translate(${hoveredAnchor.x}, ${hoveredAnchor.y})${rData.orientation === 'y-up' ? ' scale(1, -1)' : ''} scale(${s})`} style={{ pointerEvents: 'none' }}>
            <rect x={4} y={-8} width={55} height={10} rx="1.5" fill="rgba(15, 23, 42, 0.95)" stroke="var(--brand)" strokeWidth="0.4" />
            <text x={6} y={-4.5} fontSize="2.5" fontFamily="var(--font-mono)" fill="var(--brand-soft)" fontWeight="bold">{hoveredAnchor.objectId}.{hoveredAnchor.name}</text>
            <text x={6} y={-1} fontSize="2.2" fontFamily="var(--font-mono)" fill="white" opacity="0.9">({hoveredAnchor.x.toFixed(1)}, {hoveredAnchor.y.toFixed(1)})</text>
          </g>
        )}
      </g>
    );

    const svgStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none' as const,
      zIndex: 10,
    };

    if (selectedSheetId && rData.sheets?.[selectedSheetId]) {
      const sheet = rData.sheets[selectedSheetId];
      return (
        <svg className="canvas-overlay" viewBox={`0 0 ${sheet.width} ${sheet.height}`} style={svgStyle}>
          {sheet.views.map((vPlacement, idx) => {
            const view = rData.views?.[vPlacement.use];
            if (!view) return null;
            const viewBbox = calculateBoundingBox(view.objects, new Map());
            const scale = view.scaleFactor ?? 1;
            const tform = `translate(${vPlacement.x}, ${vPlacement.y}) scale(${scale}) translate(${-viewBbox.x}, ${-viewBbox.y})`;
            return <g key={idx}>{renderObjects(view.objects, tform)}</g>;
          })}
        </svg>
      );
    }

    return (
      <svg className="canvas-overlay" viewBox={viewBox} style={svgStyle}>
        {renderObjects(rData.objects, sceneTransform)}
      </svg>
    );
  };

    const logicalPreviewFrame = resolvedData && !selectedSheetId && resolvedData.autoSize !== false && resolvedData.bbox
      ? getPreviewFrameSize(resolvedData, selectedSheetId, 'logical')
      : null;
    const physicalPreviewFrame = resolvedData && !selectedSheetId && resolvedData.autoSize !== false && resolvedData.bbox
      ? getPreviewFrameSize(resolvedData, selectedSheetId, 'physical')
      : null;
    const modelPreviewDisplayFrame = !isPrintMode && logicalPreviewFrame && physicalPreviewFrame
      ? {
          width: physicalPreviewFrame.width * (zoom / 100),
          height: physicalPreviewFrame.height * (zoom / 100),
        }
      : null;
    const fluidWidth: string | number = !isPrintMode
      ? (modelPreviewDisplayFrame ? `${modelPreviewDisplayFrame.width}px` : 'auto')
      : (resolvedData && !selectedSheetId && resolvedData.autoSize !== false && resolvedData.bbox
        ? formatPreviewFrameCssLength(resolvedData, resolvedData.bbox.width + (resolvedData.padding ?? 20) * 2)
        : 'auto');
    const fluidHeight: string | number = !isPrintMode
      ? (modelPreviewDisplayFrame ? `${modelPreviewDisplayFrame.height}px` : 'auto')
      : (resolvedData && !selectedSheetId && resolvedData.autoSize !== false && resolvedData.bbox
        ? formatPreviewFrameCssLength(resolvedData, resolvedData.bbox.height + (resolvedData.padding ?? 20) * 2)
        : 'auto');
    const modelPreviewSurfaceCss = !isPrintMode
      ? `
          .svg-wrapper .svg-inner-wrapper > svg {
            width: 100% !important;
            height: 100% !important;
          }
        `
      : '';

  return (
    <section className="canvas-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Dynamic Overlay Control Bar */}
      <div
        className="overlay-toolbar"
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.4rem 0.8rem',
          background: 'var(--panel-strong)',
          borderBottom: '1px solid var(--line)',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            {previewLabel}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
            {previewHint}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {toolbarMode === 'model' && (
            <>
              <button
                onClick={() => setOverlay(p => ({ ...p, showSegments: !p.showSegments }))}
                className={overlay.showSegments ? 'active' : ''}
                title="Toggle Indices"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: overlay.showSegments ? 'var(--brand-soft)' : 'white',
                  color: overlay.showSegments ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Indices}
              </button>
              <button
                onClick={() => setOverlay(p => ({ ...p, showAnchors: !p.showAnchors }))}
                className={overlay.showAnchors ? 'active' : ''}
                title="Toggle Anchors"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: overlay.showAnchors ? 'var(--brand-soft)' : 'white',
                  color: overlay.showAnchors ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Anchors}
              </button>
              <button
                onClick={() => setOverlay(p => ({ ...p, showBoundingBoxes: !p.showBoundingBoxes }))}
                className={overlay.showBoundingBoxes ? 'active' : ''}
                title="Toggle Bounds"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: overlay.showBoundingBoxes ? 'var(--brand-soft)' : 'white',
                  color: overlay.showBoundingBoxes ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Bounds}
              </button>
              <button
                onClick={() => setOverlay(p => ({ ...p, showLabels: !p.showLabels }))}
                className={overlay.showLabels ? 'active' : ''}
                title="Toggle Labels"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: overlay.showLabels ? 'var(--brand-soft)' : 'white',
                  color: overlay.showLabels ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Labels}
              </button>
              <button
                onClick={() => setPreviewLineMode('static')}
                className={previewLineMode === 'static' ? 'active' : ''}
                title="Static Screen Line Preview"
                style={{
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: previewLineMode === 'static' ? 'var(--brand-soft)' : 'white',
                  color: previewLineMode === 'static' ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Static
              </button>
              <button
                onClick={() => setPreviewLineMode('physical-relative')}
                className={previewLineMode === 'physical-relative' ? 'active' : ''}
                title="Physical Relative Line Preview"
                style={{
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: previewLineMode === 'physical-relative' ? 'var(--brand-soft)' : 'white',
                  color: previewLineMode === 'physical-relative' ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Relative
              </button>
            </>
          )}
          {toolbarMode === 'physical' && (
            <>
              <button
                onClick={() => setShowAnchors(!showAnchors)}
                className={showAnchors ? 'active' : ''}
                title="Toggle Anchors"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: showAnchors ? 'var(--brand-soft)' : 'white',
                  color: showAnchors ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Anchors}
              </button>
              <button
                onClick={() => setShowBoundingBox(!showBoundingBox)}
                className={showBoundingBox ? 'active' : ''}
                title="Toggle Bounds"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: showBoundingBox ? 'var(--brand-soft)' : 'white',
                  color: showBoundingBox ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Bounds}
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={showLabels ? 'active' : ''}
                title="Toggle Labels"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: showLabels ? 'var(--brand-soft)' : 'white',
                  color: showLabels ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Labels}
              </button>
              <button
                onClick={() => setShowDimensions(!showDimensions)}
                className={showDimensions ? 'active' : ''}
                title="Toggle Dimensions"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: showDimensions ? 'var(--brand-soft)' : 'white',
                  color: showDimensions ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Dimensions}
              </button>
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={showAnnotations ? 'active' : ''}
                title="Toggle Annotations"
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: showAnnotations ? 'var(--brand-soft)' : 'white',
                  color: showAnnotations ? 'var(--brand)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {ICONS.Annotations}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        className={`preview-stage ${dragState ? 'is-dragging' : ''}`}
        onWheel={handleWheelZoom}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ flex: 1, overflow: 'auto', position: 'relative' }}
      >
        <div className="preview-viewport" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%', padding: '2rem' }}>
          <div
            className="svg-wrapper-container"
            style={{
              position: 'relative',
              display: 'inline-block',
              zoom: isPrintMode ? zoom / 100 : 1,
              pointerEvents: 'auto',
            }}
          >
            {svgContent ? (
              <div
                className="svg-wrapper"
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  padding: 0,
                  width: fluidWidth,
                  height: fluidHeight,
                }}
              >
                <div
                  className="svg-inner-wrapper"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                {modelPreviewSurfaceCss && (
                  <style>
                    {modelPreviewSurfaceCss}
                  </style>
                )}
                {hiddenRoles && hiddenRoles.size > 0 && (
                  <style>
                    {Array.from(hiddenRoles).map(role => `.role-${role} { display: none !important; }`).join('\n')}
                  </style>
                )}
                {renderOverlayLayer()}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Preview belum tersedia</h3>
                <p>Perbaiki DSL atau tambahkan objek untuk melihat hasil.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-message-box">
            <div className="error-title">
              <strong>{fullError?.code || 'Error'}</strong>
              {fullError?.objectId && <span className="error-object-id">[{fullError.objectId}]</span>}
              {errorPath && <code className="error-path">{errorPath}</code>}
            </div>
            <p className="error-text">{error}</p>
            {errorHint && (
              <p className="error-text" style={{ marginTop: '0.35rem', color: 'var(--muted)' }}>
                {errorHint}
              </p>
            )}
            {fullError?.dependencyChain && (
              <div className="dependency-chain">
                <span className="chain-label">Chain:</span>
                <code>{fullError.dependencyChain.join(' → ')}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
