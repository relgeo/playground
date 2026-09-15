import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
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
  const backdropRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible || !onClose || typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 840px)').matches) return;

    const frame = window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLElement>('.sidebar-panel-header')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visible, onClose]);

  const handleDrawerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!visible || !onClose || event.key !== 'Tab' || typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 840px)').matches || !sidebarRef.current) return;

    const focusable = Array.from(
      sidebarRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
    if (backdropRef.current && !backdropRef.current.hasAttribute('disabled') && backdropRef.current.getClientRects().length > 0) {
      focusable.push(backdropRef.current);
    }
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {visible && onClose && (
        <button
          type="button"
          ref={backdropRef}
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={onClose}
          onKeyDown={handleDrawerKeyDown}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`${sidebarClass} ${isResizing ? 'is-resizing' : ''}`}
        aria-label="Workspace tools"
        onKeyDown={handleDrawerKeyDown}
        style={{ width: `${sidebarWidth}px` }}
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
          className={`sidebar-resizer ${position === 'left' ? 'is-left' : 'is-right'}`}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-valuemin={240}
          aria-valuemax={600}
          aria-valuenow={width}
          aria-valuetext={`${width}px sidebar width`}
          aria-label={`Resize ${position === 'left' ? 'left' : 'right'} sidebar width`}
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
        <span className="sidebar-panel-chevron">
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
