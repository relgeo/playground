import { ICONS } from '../Icons';
import { EXAMPLES } from '../../examples';

interface ExampleCardProps {
  selectedExample: string;
  onChange: (key: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function ExampleCard({
  selectedExample,
  onChange,
  collapsed,
  setCollapsed,
}: ExampleCardProps) {
  const example = EXAMPLES[selectedExample];

  return (
    <section className="example-card">
      <div className="example-head">
        <div>
          <p className="section-kicker">Example</p>
          <h2>{example.name}</h2>
        </div>
        <div className="panel-head-actions">
          <span className="example-tag">{example.category}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? ICONS.ChevronDown : ICONS.ChevronUp}
          </button>
        </div>
      </div>
      {!collapsed && <p className="example-summary">{example.summary}</p>}
      <select
        className="example-select"
        aria-label="Choose example"
        value={selectedExample}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.entries(EXAMPLES).map(([key, item]) => (
          <option key={key} value={key}>
            {item.name}
          </option>
        ))}
      </select>
    </section>
  );
}
