import { ReactNode, useEffect, useRef } from 'react';
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
  onResizeKeyboard?: (delta: number) => void;
  onClose?: () => void;
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
  onResizeKeyboard,
  onClose,
  children,
}: SidebarProps) {
  const sidebarWidth = visible ? width : 0;
  const sidebarClass = `sidebar ${!visible ? 'is-hidden' : ''}`;
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!visible || !onClose || typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 840px)').matches) return;

    const frame = window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLElement>('.sidebar-panel-header')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visible, onClose]);

  return (
    <>
      {visible && onClose && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}
      <aside
        ref={sidebarRef}
        className={sidebarClass}
        aria-label="Workspace tools"
        style={{ 
          width: `${sidebarWidth}px`,
          transition: isResizing ? 'none' : 'width 0.2s ease',
          position: 'relative'
        }}
      >
      <div className="sidebar-content">
        {hasProfiles && (
          <SidebarPanel 
            panelId="profiles"
            title="Parameter Profiles" 
            isExpanded={panelState.profiles} 
            onToggle={() => togglePanel('profiles')}
          >
            {children.profiles}
          </SidebarPanel>
        )}

        {hasParameters && (
          <SidebarPanel 
            panelId="parameters"
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
            panelId="meta-presets"
            title="Metadata Presets (Read-only)"
            isExpanded={panelState.metaPresets}
            onToggle={() => togglePanel('metaPresets')}
          >
            {children.metaPresets}
          </SidebarPanel>
        )}

        <SidebarPanel 
          panelId="inspector"
          title="Inspector" 
          isExpanded={panelState.inspector} 
          onToggle={() => togglePanel('inspector')}
          large
        >
          {children.inspector}
        </SidebarPanel>

        <SidebarPanel 
          panelId="layers"
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
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-valuemin={240}
          aria-valuemax={600}
          aria-valuenow={width}
          aria-label={`Resize sidebar ${position === 'left' ? 'width' : 'width'}`}
          onPointerDown={onResizeStart}
          onKeyDown={(event) => {
            if (!onResizeKeyboard) return;
            const step = event.shiftKey ? 48 : 24;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              const grows = position === 'left' ? event.key === 'ArrowRight' : event.key === 'ArrowLeft';
              onResizeKeyboard(grows ? step : -step);
            } else if (event.key === 'Home') {
              event.preventDefault();
              onResizeKeyboard(240 - width);
            } else if (event.key === 'End') {
              event.preventDefault();
              onResizeKeyboard(600 - width);
            }
          }}
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
    </>
  );
}

interface SidebarPanelProps {
  panelId: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  large?: boolean;
}

function SidebarPanel({ panelId, title, isExpanded, onToggle, children, large }: SidebarPanelProps) {
  const headerId = `sidebar-panel-header-${panelId}`;
  const bodyId = `sidebar-panel-body-${panelId}`;
  return (
    <div className="sidebar-panel">
      <button
        id={headerId}
        type="button"
        className="sidebar-panel-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
      >
        <h3>{title}</h3>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
          {isExpanded ? ICONS.ChevronUp : ICONS.ChevronDown}
        </span>
      </button>
      <div
        id={bodyId}
        className={`sidebar-panel-body ${!isExpanded ? 'is-collapsed' : ''} ${large ? 'is-large' : ''}`}
        role="region"
        aria-labelledby={headerId}
        hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}
