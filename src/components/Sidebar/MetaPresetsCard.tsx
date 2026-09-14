import type { RelGeoDocument } from '@relgeo/core';

interface MetaPresetsCardProps {
  doc: RelGeoDocument | null | undefined;
}

export function MetaPresetsCard({ doc }: MetaPresetsCardProps) {
  const presets = doc?.metaPresets ?? doc?.styles;
  if (!presets || Object.keys(presets).length === 0) return null;

  return (
    <div className="meta-presets-list">
      <div className="meta-presets-description">
        Read-only reference for reusable object metadata bundles defined in the document.
      </div>
      {Object.entries(presets).map(([name, preset]) => {
        const entries = Object.entries((preset ?? {}) as Record<string, unknown>);
        return (
          <div
            key={name}
            className="meta-preset-card"
          >
            <div className="meta-preset-heading">
              <strong className="meta-preset-name">{name}</strong>
              <span className="meta-preset-kind">
                reference
              </span>
            </div>
            <div className="meta-preset-entries">
              {entries.map(([key, value]) => (
                <span
                  key={key}
                  className="meta-preset-entry"
                  title={`${key}: ${String(value)}`}
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
