import { TECHNICAL_ROLES } from '@relgeo/core';

interface LayersCardProps {
  hiddenRoles: Set<string>;
  setHiddenRoles: (roles: Set<string>) => void;
}

export function LayersCard({ hiddenRoles, setHiddenRoles }: LayersCardProps) {
  return (
    <div className="layers-list">
      {TECHNICAL_ROLES.map((role) => (
        <label key={role} className="layer-toggle">
          <input
            type="checkbox"
            aria-label={`Show ${role}`}
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
