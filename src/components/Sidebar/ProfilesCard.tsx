import type { RelGeoDocument } from 'relgeo-core';

interface ProfilesCardProps {
  doc: RelGeoDocument | null | undefined;
  selectedProfile: string | null;
  setSelectedProfile: (name: string | null) => void;
  setParamOverrides: (overrides: Record<string, number>) => void;
}

export function ProfilesCard({
  doc,
  selectedProfile,
  setSelectedProfile,
  setParamOverrides,
}: ProfilesCardProps) {
  if (!doc?.profiles || Object.keys(doc.profiles).length === 0) return null;

  const handleSelect = (name: string | null, overrides: Record<string, number> = {}) => {
    setSelectedProfile(name);
    setParamOverrides(overrides);
  };

  return (
    <div className="profiles-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div
        style={{
          fontSize: '0.72rem',
          lineHeight: 1.45,
          color: 'var(--muted)',
          padding: '0.1rem 0.05rem 0',
        }}
      >
        Interactive presets for swapping many parameter override values at once in the Playground.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        <button
          type="button"
          className={`profile-item ${selectedProfile === null ? 'active' : ''}`}
          onClick={() => handleSelect(null, {})}
        >
          Default
        </button>
        {Object.entries(doc.profiles).map(([name, profile]) => {
          const p = profile as unknown as { overrides?: Record<string, number> };
          return (
            <button
              key={name}
              type="button"
              className={`profile-item ${selectedProfile === name ? 'active' : ''}`}
              onClick={() => handleSelect(name, p.overrides || {})}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
