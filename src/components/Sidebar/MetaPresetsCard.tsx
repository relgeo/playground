import type { RelGeoDocument } from '@relgeo/core';

interface MetaPresetsCardProps {
  doc: RelGeoDocument | null | undefined;
}

export function MetaPresetsCard({ doc }: MetaPresetsCardProps) {
  const presets = doc?.metaPresets ?? doc?.styles;
  if (!presets || Object.keys(presets).length === 0) return null;

  return (
    <div className="meta-presets-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        style={{
          fontSize: '0.72rem',
          lineHeight: 1.45,
          color: 'var(--muted)',
          padding: '0.1rem 0.05rem 0.15rem',
        }}
      >
        Read-only reference for reusable object metadata bundles defined in the document.
      </div>
      {Object.entries(presets).map(([name, preset]) => {
        const entries = Object.entries((preset ?? {}) as Record<string, unknown>);
        return (
          <div
            key={name}
            style={{
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '0.55rem 0.65rem',
              background: 'rgba(255, 255, 255, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{name}</strong>
              <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>
                reference
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {entries.map(([key, value]) => (
                <span
                  key={key}
                  style={{
                    fontSize: '0.66rem',
                    borderRadius: '999px',
                    padding: '0.14rem 0.42rem',
                    background: 'var(--panel-strong)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                  }}
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
