export function getClosedShapeMetricLabel(type: string, closed: boolean): string {
  if (type === 'polygon') {
    return 'Perimeter';
  }

  if (type === 'path' && closed) {
    return 'Perimeter';
  }

  return 'Total Length';
}
