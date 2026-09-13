import { useMemo } from 'react';
import { getDependencyGraph } from '@relgeo/core';
import type { RelGeoObject } from '@relgeo/core';

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
  const { nodes, edges, width, height, layoutMode } = useMemo(() => {
    const ids = Object.keys(objects ?? {});
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
  }, [objects]);

  if (!objects || Object.keys(objects).length === 0) {
    return <div className="text-sm" style={{ padding: '1rem', color: 'var(--muted)' }}>No objects.</div>;
  }

  return (
    <div className="graph-viewer-outer" style={{ width: '100%', overflow: 'auto', background: 'transparent' }}>
      <svg
        width="100%"
        // height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="RelGeo dependency graph"
        style={{ display: 'block' }}
      >
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
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onNodeSelect?.(node.id)}
              onKeyDown={(event) => {
                if (onNodeSelect && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onNodeSelect(node.id);
                }
              }}
              role={onNodeSelect ? 'button' : undefined}
              tabIndex={onNodeSelect ? 0 : undefined}
              aria-label={onNodeSelect ? `Select object ${node.id}${isRelated ? ', related to current selection' : ''}` : undefined}
              aria-pressed={onNodeSelect ? isSelected : undefined}
              style={{ cursor: onNodeSelect ? 'pointer' : 'default', outline: 'none' }}
            >
              {/* Interactive Node Card */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="6"
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected ? "2.5" : "1.25"}
                style={{
                  transition: 'all 150ms ease',
                  filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' : 'none'
                }}
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
  );
}
