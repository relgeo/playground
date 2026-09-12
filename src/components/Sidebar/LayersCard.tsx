import { TECHNICAL_ROLES } from '@relgeo/core';

interface LayersCardProps {
  hiddenRoles: Set<string>;
  setHiddenRoles: (roles: Set<string>) => void;
}

export function LayersCard({ hiddenRoles, setHiddenRoles }: LayersCardProps) {
  return (
    <div style={{ padding: '0.75rem' }}>
      {TECHNICAL_ROLES.map((role) => (
        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={!hiddenRoles.has(role)}
            onChange={(event) => {
              const nextHiddenRoles = new Set(hiddenRoles);
              if (event.target.checked) nextHiddenRoles.delete(role);
              else nextHiddenRoles.add(role);
              setHiddenRoles(nextHiddenRoles);
            }}
          />
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </label>
      ))}
    </div>
  );
}
