export type GraphNavigationKey =
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'End'
  | 'Home';

/**
 * Returns the next visible graph node for the keyboard navigation contract.
 * The graph is intentionally treated as one deterministic reading order:
 * directional keys move through that order, while Home/End jump to its edges.
 */
export function getGraphNavigationTarget(
  visibleObjectIds: string[],
  currentObjectId: string,
  key: string
): string | null {
  const currentIndex = visibleObjectIds.indexOf(currentObjectId);
  if (currentIndex < 0 || visibleObjectIds.length === 0) return null;

  let nextIndex: number | null = null;
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % visibleObjectIds.length;
  } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + visibleObjectIds.length) % visibleObjectIds.length;
  } else if (key === 'Home') {
    nextIndex = 0;
  } else if (key === 'End') {
    nextIndex = visibleObjectIds.length - 1;
  }

  return nextIndex === null ? null : visibleObjectIds[nextIndex];
}
