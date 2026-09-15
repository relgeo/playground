export function getClosedShapeMetricLabel(type: string, closed: boolean): string {
  if (type === 'polygon') {
    return 'Perimeter';
  }

  if (type === 'path' && closed) {
    return 'Perimeter';
  }

  return 'Total Length';
}

export interface DiagnosticTargetInput {
  error?: {
    objectId?: string | null;
    path?: string | null;
    dependencyChain?: readonly string[] | null;
  } | null;
  firstViolation?: {
    objectId?: string | null;
  } | null;
}

export interface DiagnosticTarget {
  kind: 'object' | 'path' | 'dependency';
  value: string;
}

/**
 * Chooses the most useful source navigation target for the first diagnostic.
 * Object targets are preferred, followed by a violation object, source path,
 * and finally the first node in a dependency chain.
 */
export function getFirstDiagnosticTarget({
  error,
  firstViolation,
}: DiagnosticTargetInput): DiagnosticTarget | null {
  if (error?.objectId) return { kind: 'object', value: error.objectId };
  if (firstViolation?.objectId) return { kind: 'object', value: firstViolation.objectId };
  if (error?.path) return { kind: 'path', value: error.path };
  const dependencyNode = error?.dependencyChain?.[0];
  if (dependencyNode) return { kind: 'dependency', value: dependencyNode };
  return null;
}

export interface InspectorDependencyGraphEntry {
  id: string;
  deps: string[];
}

/**
 * Returns the nearby dependency neighborhood for an object.
 *
 * The graph is treated as undirected for inspection: both dependencies and
 * dependents are useful context when diagnosing a selected object. A bounded
 * breadth-first walk keeps large documents readable while still exposing
 * indirect relationships.
 */
export function getRelatedObjectIds(
  graph: InspectorDependencyGraphEntry[],
  objectId: string,
  availableObjectIds: Iterable<string> = [],
  maxDepth = 2,
): string[] {
  if (maxDepth < 1 || graph.length === 0) return [];

  const graphIds = new Set(graph.map((entry) => entry.id));
  const baseObjectId = objectId.split('[')[0];
  const startId = graphIds.has(objectId) ? objectId : baseObjectId;
  if (!graphIds.has(startId)) return [];

  const adjacency = new Map<string, Set<string>>();
  const connect = (from: string, to: string) => {
    const neighbors = adjacency.get(from) ?? new Set<string>();
    neighbors.add(to);
    adjacency.set(from, neighbors);
  };

  for (const entry of graph) {
    adjacency.set(entry.id, adjacency.get(entry.id) ?? new Set<string>());
    for (const dependencyId of entry.deps) {
      if (!graphIds.has(dependencyId)) continue;
      connect(entry.id, dependencyId);
      connect(dependencyId, entry.id);
    }
  }

  const availableIds = new Set(availableObjectIds);
  const distances = new Map<string, number>([[startId, 0]]);
  const queue = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = distances.get(currentId) ?? 0;
    if (currentDepth >= maxDepth) continue;

    for (const neighborId of adjacency.get(currentId) ?? []) {
      if (distances.has(neighborId)) continue;
      distances.set(neighborId, currentDepth + 1);
      queue.push(neighborId);
    }
  }

  return Array.from(distances.entries())
    .filter(([, depth]) => depth > 0 && depth <= maxDepth)
    .map(([id]) => id)
    .map((id) => {
      if (availableIds.has(id)) return id;
      const generatedIds = Array.from(availableIds).filter((availableId) => availableId.split('[')[0] === id);
      return generatedIds[0] ?? id;
    })
    .filter((id, index, ids) => id !== objectId && ids.indexOf(id) === index)
    .filter((id) => availableIds.size === 0 || availableIds.has(id));
}
