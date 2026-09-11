import { ReactNode } from 'react';
import { ICONS } from './Icons';
import type { SidebarPanels } from '../types';

interface SidebarProps {
  visible: boolean;
  position: 'left' | 'right';
  panelState: SidebarPanels;
  togglePanel: (panel: keyof SidebarPanels) => void;
  hasProfiles: boolean;
  hasParameters: boolean;
  hasMetaPresets: boolean;
  width: number;
  isResizing?: boolean;
  onResizeStart?: () => void;
  children: {
    profiles: ReactNode;
    parameters: ReactNode;
    metaPresets: ReactNode;
    inspector: ReactNode;
    layers: ReactNode;
  };
}

export function Sidebar({
  visible,
  position,
  panelState,
  togglePanel,
  hasProfiles,
  hasParameters,
  hasMetaPresets,
  width,
  isResizing,
  onResizeStart,
  children,
}: SidebarProps) {
  const sidebarWidth = visible ? width : 0;
  const sidebarClass = `sidebar ${!visible ? 'is-hidden' : ''}`;

  return (
    <aside 
      className={sidebarClass}
      style={{ 
        width: `${sidebarWidth}px`,
        transition: isResizing ? 'none' : 'width 0.2s ease',
        position: 'relative'
      }}
    >
      <div className="sidebar-content">
        {hasProfiles && (
          <SidebarPanel 
            title="Parameter Profiles" 
            isExpanded={panelState.profiles} 
            onToggle={() => togglePanel('profiles')}
          >
            {children.profiles}
          </SidebarPanel>
        )}

        {hasParameters && (
          <SidebarPanel 
            title="Parameters" 
            isExpanded={panelState.parameters} 
            onToggle={() => togglePanel('parameters')}
            large
          >
            {children.parameters}
          </SidebarPanel>
        )}

        {hasMetaPresets && (
          <SidebarPanel
            title="Metadata Presets (Read-only)"
            isExpanded={panelState.metaPresets}
            onToggle={() => togglePanel('metaPresets')}
          >
            {children.metaPresets}
          </SidebarPanel>
        )}

        <SidebarPanel 
          title="Inspector" 
          isExpanded={panelState.inspector} 
          onToggle={() => togglePanel('inspector')}
          large
        >
          {children.inspector}
        </SidebarPanel>

        <SidebarPanel 
          title="Layers" 
          isExpanded={panelState.layers} 
          onToggle={() => togglePanel('layers')}
        >
          {children.layers}
        </SidebarPanel>
      </div>

      {visible && onResizeStart && (
        <div
          className="sidebar-resizer"
          onMouseDown={onResizeStart}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '5px',
            cursor: 'col-resize',
            zIndex: 30,
            [position === 'left' ? 'right' : 'left']: 0,
            background: 'transparent',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--brand-soft)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        />
      )}
    </aside>
  );
}

interface SidebarPanelProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  large?: boolean;
}

function SidebarPanel({ title, isExpanded, onToggle, children, large }: SidebarPanelProps) {
  return (
    <div className="sidebar-panel">
      <div className="sidebar-panel-header" onClick={onToggle}>
        <h3>{title}</h3>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
          {isExpanded ? ICONS.ChevronUp : ICONS.ChevronDown}
        </span>
      </div>
      <div className={`sidebar-panel-body ${!isExpanded ? 'is-collapsed' : ''} ${large ? 'is-large' : ''}`}>
        {children}
      </div>
    </div>
  );
}
