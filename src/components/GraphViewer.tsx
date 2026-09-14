import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { getDependencyGraph } from '@relgeo/core';
import type { RelGeoObject } from '@relgeo/core';
import { getGraphNavigationTarget } from '../graph-navigation';

interface GraphViewerProps {
  objects: Record<string, RelGeoObject>;
  selectedObjectId?: string | null;
  relatedObjectIds?: string[];
  onNodeSelect?: (objectId: string) => void;
}

type GraphNode = {
  id: string;
  level: number;
  x: number;
  y: number;
};

type GraphEdge = {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

// Layout constants for LR (Left-to-Right)
const X_GAP_LR = 140;
const Y_GAP_LR = 64;

// Layout constants for TD (Top-to-Down)
const X_GAP_TD = 95;
const Y_GAP_TD = 80;

const NODE_WIDTH = 90;
const NODE_HEIGHT = 32;
const PADDING = 5;

export function GraphViewer({
  objects,
  selectedObjectId,
  relatedObjectIds = [],
  onNodeSelect,
}: GraphViewerProps) {
  const [objectQuery, setObjectQuery] = useState('');
  const [focusSelection, setFocusSelection] = useState(false);
  const graphNodeRefs = useRef<Record<string, SVGGElement | null>>({});
  const allObjectIds = Object.keys(objects ?? {});
  const normalizedQuery = objectQuery.trim().toLowerCase();
  const visibleObjectIds = useMemo(() => {
    const queryMatches = allObjectIds.filter((id) => {
      if (!normalizedQuery) return true;
      return id.toLowerCase().includes(normalizedQuery)
        || (objects[id]?.type ?? 'unknown').toLowerCase().includes(normalizedQuery);
    });
    if (!focusSelection || !selectedObjectId) return queryMatches;

    const focusedIds = new Set([selectedObjectId, ...relatedObjectIds]);
    return queryMatches.filter((id) => focusedIds.has(id));
  }, [allObjectIds, focusSelection, normalizedQuery, objects, relatedObjectIds, selectedObjectId]);

  const rovingFocusNodeId = selectedObjectId && visibleObjectIds.includes(selectedObjectId)
    ? selectedObjectId
    : visibleObjectIds[0] ?? null;

  const handleNodeKeyDown = (event: KeyboardEvent<SVGGElement>, nodeId: string) => {
    if (!onNodeSelect) return;

    const nextNodeId = getGraphNavigationTarget(visibleObjectIds, nodeId, event.key);
    if (!nextNodeId) return;

    event.preventDefault();
    graphNodeRefs.current[nextNodeId]?.focus();
  };

  const { nodes, edges, width, height, layoutMode } = useMemo(() => {
    const ids = visibleObjectIds;
    const levels: Record<string, number> = {};

    // 1. Calculate dependency Graph map using @relgeo/core's getDependencyGraph
    const graphData = getDependencyGraph(objects);
    const dependencyGraph: Record<string, string[]> = {};
    graphData.forEach(item => {
      dependencyGraph[item.id] = item.deps;
    });

    const getDependencies = (id: string): string[] => {
      return (dependencyGraph[id] ?? []).filter((dep) => ids.includes(dep));
    };

    const visiting = new Set<string>();

    const computeLevel = (id: string): number => {
      if (levels[id] !== undefined) return levels[id];

      // Defensive cycle handling.
      if (visiting.has(id)) {
        levels[id] = 0;
        return 0;
      }

      visiting.add(id);

      const deps = getDependencies(id);
      const level =
        deps.length === 0
          ? 0
          : Math.max(...deps.map((dep) => computeLevel(dep))) + 1;

      visiting.delete(id);
      levels[id] = level;

      return level;
    };

    ids.forEach(computeLevel);

    const grouped = new Map<number, string[]>();

    for (const id of ids) {
      const level = levels[id] ?? 0;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level)!.push(id);
    }

    // Sort level ids alphabetically for deterministic rendering
    for (const levelIds of grouped.values()) {
      levelIds.sort();
    }

    // 2. Define layout computation for Left-to-Right (Horizontal levels)
    const computeLayoutLR = () => {
      const graphNodes: GraphNode[] = [];
      for (const [level, levelIds] of grouped.entries()) {
        levelIds.forEach((id, index) => {
          graphNodes.push({
            id,
            level,
            x: PADDING + level * X_GAP_LR,
            y: PADDING + index * Y_GAP_LR,
          });
        });
      }

      const nodeMap = new Map(graphNodes.map((node) => [node.id, node]));
      const graphEdges: GraphEdge[] = [];
      for (const id of ids) {
        const target = nodeMap.get(id);
        if (!target) continue;
        for (const dep of getDependencies(id)) {
          const source = nodeMap.get(dep);
          if (!source) continue;
          graphEdges.push({
            from: dep,
            to: id,
            x1: source.x + NODE_WIDTH,
            y1: source.y + NODE_HEIGHT / 2,
            x2: target.x,
            y2: target.y + NODE_HEIGHT / 2,
          });
        }
      }

      const maxX = Math.max(0, ...graphNodes.map((n) => n.x)) + NODE_WIDTH + PADDING;
      const maxY = Math.max(0, ...graphNodes.map((n) => n.y)) + NODE_HEIGHT + PADDING;
      return { nodes: graphNodes, edges: graphEdges, width: Math.max(280, maxX), height: Math.max(200, maxY) };
    };

    // 3. Define layout computation for Top-to-Down (Vertical levels)
    const computeLayoutTD = () => {
      const graphNodes: GraphNode[] = [];
      for (const [level, levelIds] of grouped.entries()) {
        levelIds.forEach((id, index) => {
          graphNodes.push({
            id,
            level,
            x: PADDING + index * X_GAP_TD,
            y: PADDING + level * Y_GAP_TD,
          });
        });
      }

      const nodeMap = new Map(graphNodes.map((node) => [node.id, node]));
      const graphEdges: GraphEdge[] = [];
      for (const id of ids) {
        const target = nodeMap.get(id);
        if (!target) continue;
        for (const dep of getDependencies(id)) {
          const source = nodeMap.get(dep);
          if (!source) continue;
          graphEdges.push({
            from: dep,
            to: id,
            x1: source.x + NODE_WIDTH / 2,
            y1: source.y + NODE_HEIGHT,
            x2: target.x + NODE_WIDTH / 2,
            y2: target.y,
          });
        }
      }

      const maxX = Math.max(0, ...graphNodes.map((n) => n.x)) + NODE_WIDTH + PADDING;
      const maxY = Math.max(0, ...graphNodes.map((n) => n.y)) + NODE_HEIGHT + PADDING;
      return { nodes: graphNodes, edges: graphEdges, width: Math.max(280, maxX), height: Math.max(200, maxY) };
    };

    const lr = computeLayoutLR();
    const td = computeLayoutTD();

    // 4. Select the most portrait layout (largest height-to-width aspect ratio)
    const ratioLR = lr.height / lr.width;
    const ratioTD = td.height / td.width;

    if (ratioTD >= ratioLR) {
      return { ...td, layoutMode: 'TD' as const };
    } else {
      return { ...lr, layoutMode: 'LR' as const };
    }
  }, [objects, visibleObjectIds]);

  if (!objects || Object.keys(objects).length === 0) {
    return <div className="graph-viewer-empty graph-viewer-empty-state">No objects.</div>;
  }

  return (
    <div className="graph-viewer-shell">
      <div className="graph-viewer-controls" role="group" aria-label="Graph filters">
        <label htmlFor="graph-object-filter">Find object</label>
        <input
          id="graph-object-filter"
          type="search"
          value={objectQuery}
          onChange={(event) => setObjectQuery(event.target.value)}
          placeholder="Name or type…"
          aria-label="Find graph object by name or type"
        />
        <button
          type="button"
          onClick={() => setFocusSelection((value) => !value)}
          disabled={!selectedObjectId}
          aria-pressed={focusSelection && Boolean(selectedObjectId)}
          title={selectedObjectId ? 'Show only the selected object and its related neighborhood' : 'Select an object first'}
        >
          Focus selection
        </button>
        <span className="graph-viewer-count" role="status" aria-live="polite">
          Showing {visibleObjectIds.length} of {allObjectIds.length} objects
        </span>
      </div>
      <div className="graph-viewer-legend" aria-label="Graph legend">
        <span className="graph-legend-item"><i className="graph-legend-swatch is-point" aria-hidden="true" />Point</span>
        <span className="graph-legend-item"><i className="graph-legend-swatch is-curve" aria-hidden="true" />Curve</span>
        <span className="graph-legend-item"><i className="graph-legend-swatch is-other" aria-hidden="true" />Container / other</span>
        <span className="graph-legend-item"><i className="graph-legend-swatch is-selected" aria-hidden="true" />Selected</span>
        <span className="graph-legend-item"><i className="graph-legend-swatch is-related" aria-hidden="true" />Related</span>
      </div>
      {onNodeSelect ? (
        <p className="visually-hidden" id="graph-keyboard-hint">
          Graph nodes are selectable buttons. Press Enter or Space to select a node. Use Arrow keys to move between nodes, or Home and End to jump to the first or last node.
        </p>
      ) : null}
      {visibleObjectIds.length === 0 ? (
        <div className="graph-viewer-empty" role="status">
          No graph objects match this filter.
        </div>
      ) : (
      <div className="graph-viewer-outer">
      <svg
        width="100%"
        // height={height}
        viewBox={`0 0 ${width} ${height}`}
        role={onNodeSelect ? 'group' : 'img'}
        aria-label="RelGeo dependency graph"
        aria-describedby={onNodeSelect ? 'graph-keyboard-hint' : undefined}
        className="graph-viewer-canvas"
      >
        <title>RelGeo dependency graph</title>
        <defs>
          <marker
            id="relgeo-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--muted)" />
          </marker>
        </defs>

        {edges.map((edge) => {
          // Dynamic curve rendering depending on layout mode
          const pathD = layoutMode === 'LR'
            ? `M ${edge.x1} ${edge.y1} C ${(edge.x1 + edge.x2) / 2} ${edge.y1}, ${(edge.x1 + edge.x2) / 2} ${edge.y2}, ${edge.x2} ${edge.y2}`
            : `M ${edge.x1} ${edge.y1} C ${edge.x1} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${edge.y2}`;

          return (
            <path
              key={`${edge.from}->${edge.to}`}
              d={pathD}
              stroke="var(--line)"
              strokeWidth="1.25"
              fill="none"
              opacity="0.8"
              markerEnd="url(#relgeo-arrow)"
            />
          );
        })}

        {nodes.map((node) => {
          const type = objects[node.id]?.type || 'unknown';
          const isPoint = type === 'point';
          const isCurve = ['line', 'arc', 'path', 'polygon'].includes(type);
          const isSelected = node.id === selectedObjectId;
          const isRelated = relatedObjectIds.includes(node.id);

          let fill = 'var(--panel-strong)';
          let stroke = 'var(--line)';
          let textFill = 'var(--ink)';

          if (isPoint) {
            fill = isSelected ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.06)';
            stroke = 'var(--accent)';
            textFill = 'var(--accent)';
          } else if (isCurve) {
            fill = isSelected ? 'rgba(15, 118, 110, 0.15)' : 'rgba(15, 118, 110, 0.06)';
            stroke = 'var(--brand)';
            textFill = 'var(--brand)';
          } else if (isSelected) {
            fill = 'var(--line)';
            stroke = 'var(--ink)';
          }

          if (isRelated && !isSelected) {
            fill = 'rgba(217, 119, 6, 0.12)';
            stroke = 'var(--accent)';
            textFill = 'var(--accent)';
          }

          return (
            <g
              key={node.id}
              ref={(element) => {
                graphNodeRefs.current[node.id] = element;
              }}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onNodeSelect?.(node.id)}
              onKeyDown={(event) => {
                if (onNodeSelect && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onNodeSelect(node.id);
                  return;
                }
                handleNodeKeyDown(event, node.id);
              }}
              role={onNodeSelect ? 'button' : undefined}
              tabIndex={onNodeSelect && node.id === rovingFocusNodeId ? 0 : -1}
              focusable={onNodeSelect ? 'true' : undefined}
              aria-label={onNodeSelect ? `Select object ${node.id}${isRelated ? ', related to current selection' : ''}` : undefined}
              aria-pressed={onNodeSelect ? isSelected : undefined}
              className={`graph-node${onNodeSelect ? ' is-interactive' : ''}`}
            >
              {/* Interactive Node Card */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="6"
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected ? "2.5" : "1.25"}
                className={`graph-node-rect ${isSelected ? 'selected' : ''}`}
              />

              <text
                x={NODE_WIDTH / 2}
                y={NODE_HEIGHT / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fontFamily="var(--font-mono)"
                fill={textFill}
                fontWeight="500"
              >
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      )}
    </div>
  );
}
