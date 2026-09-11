import { useState } from 'react';
import { ICONS } from './Icons';
import type { ViewMode, SidebarPosition } from '../types';
import { EXAMPLES } from '../examples';
import { getSheetPreviewEntryLabel, getSheetPreviewEntryTarget } from '../view-state';

import type { RelGeoDocument } from 'relgeo-core';

function formatZoomLabel(zoom: number): string {
  if (zoom >= 100) return `${Math.round(zoom)}%`;
  if (zoom >= 10) return `${zoom.toFixed(1).replace(/\.0$/, '')}%`;
  if (zoom >= 1) return `${zoom.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  return `${zoom.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
}

interface NavbarProps {
  selectedExample: string;
  onExampleChange: (key: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
  sidebarPosition: SidebarPosition;
  setSidebarPosition: (pos: SidebarPosition) => void;
  status: 'error' | 'ready' | 'idle' | 'resolving';
  statusLabel: string;
  statusDetail?: string | null;
  // Editor actions
  onCopy: () => void;
  onReset: () => void;
  onShareLink: () => void;
  // Preview actions
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onExport: () => void;
  // Sheet actions
  doc: RelGeoDocument | null;
  selectedSheetId: string | null;
  onSheetChange: (sheetId: string | null) => void;
  isPrintMode: boolean;
  setIsPrintMode: (val: boolean) => void;
}

export function Navbar({
  selectedExample,
  onExampleChange,
  viewMode,
  setViewMode,
  sidebarVisible,
  setSidebarVisible,
  sidebarPosition,
  setSidebarPosition,
  status,
  statusLabel,
  statusDetail,
  onCopy,
  onReset,
  onShareLink,
  zoom,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onExport,
  doc,
  selectedSheetId,
  onSheetChange,
  isPrintMode,
  setIsPrintMode,
}: NavbarProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const hasSheets = !!doc?.sheets && Object.keys(doc.sheets).length > 0;
  const sheetIds = doc?.sheets ? Object.keys(doc.sheets) : [];
  const sheetPreviewEntryTarget = getSheetPreviewEntryTarget(
    sheetIds,
    selectedSheetId,
    isPrintMode
  );
  const sheetPreviewEntryLabel = getSheetPreviewEntryLabel(
    sheetIds,
    selectedSheetId,
    isPrintMode
  );
  const currentPreviewLabel = isPrintMode && selectedSheetId
    ? `Physical Preview: ${selectedSheetId}`
    : 'Model Preview';

  const handleCopyCode = () => {
    onCopy();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = () => {
    onShareLink();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <span style={{ color: 'var(--accent)' }}>Rel</span><span>Geo</span>
        </div>
        <div className="navbar-divider" />
        <select
          className="example-select"
          style={{ width: '150px', marginTop: 0 }}
          value={selectedExample}
          onChange={(e) => onExampleChange(e.target.value)}
        >
          {Object.entries(EXAMPLES).map(([key, ex]) => (
            <option key={key} value={key}>
              {ex.name}
            </option>
          ))}
        </select>

        {hasSheets && (
          <>
            <div className="navbar-divider" />
            <select
              className="sheet-select"
              style={{
                width: '140px',
                marginTop: 0,
                padding: '0.2rem 0.4rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                background: 'var(--panel)',
                color: 'var(--ink)'
              }}
              value={selectedSheetId || ""}
              onChange={(e) => onSheetChange(e.target.value || null)}
              title="Choose model preview or a sheet/view print-oriented surface"
            >
              <option value="">Model Preview</option>
              {Object.keys(doc.sheets).map(sheetId => (
                <option key={sheetId} value={sheetId}>Sheet/View: {sheetId}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="navbar-center">
        <div className={`status-indicator status-${status}`}>
          <div className="status-dot" />
          <span>{statusLabel}</span>
          {statusDetail && (
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: '0.45rem' }}>
              {statusDetail}
            </span>
          )}
        </div>

        {/* Preview Toolbar (Visible if Preview is not collapsed) */}
        {viewMode !== 'editor-only' && (
          <>
            <div className="navbar-divider" />
            <div className="control-group">
              <span
                style={{
                  fontSize: '0.68rem',
                  color: isPrintMode ? 'var(--brand)' : 'var(--muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
                title={hasSheets
                  ? 'Preview route switches between model preview and sheet/view physical preview'
                  : 'This document is currently in model preview'}
              >
                {currentPreviewLabel}
              </span>
              {sheetPreviewEntryTarget && sheetPreviewEntryLabel && (
                <button
                  onClick={() => onSheetChange(sheetPreviewEntryTarget)}
                  title="Open the first available sheet/view physical preview without changing the default model-preview entry point"
                  style={{
                    border: '1px solid var(--line)',
                    background: 'var(--panel)',
                    color: 'var(--ink)',
                    borderRadius: '999px',
                    padding: '0.18rem 0.55rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sheetPreviewEntryLabel}
                </button>
              )}
              <button 
                onClick={() => setIsPrintMode(!isPrintMode)} 
                title={isPrintMode ? "Switch to Model Preview" : "Switch to Physical Preview"}
                className={isPrintMode ? 'active' : ''}
                style={{
                  background: isPrintMode ? 'var(--brand-soft)' : 'transparent',
                  color: isPrintMode ? 'var(--brand)' : 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {ICONS.Printer}
                <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                  {isPrintMode ? 'Physical' : 'Model'}
                </span>
              </button>
              <div className="navbar-divider" style={{ margin: '0 4px', opacity: 0.5 }} />
              <button onClick={onZoomOut} title="Zoom Out">{ICONS.ZoomOut}</button>
              <span style={{ fontSize: '0.7rem', width: '52px', textAlign: 'center' }}>{formatZoomLabel(zoom)}</span>
              <button onClick={onZoomIn} title="Zoom In">{ICONS.ZoomIn}</button>
              <button onClick={onRecenter} title="Recenter">{ICONS.Recenter}</button>
              <button onClick={onExport} title="Export SVG">{ICONS.Export}</button>
            </div>
          </>
        )}

        {/* Editor Toolbar (Visible if Editor is not collapsed) */}
        {viewMode !== 'preview-only' && (
          <>
            <div className="navbar-divider" />
            <div className="control-group">
              <button onClick={handleCopyCode} title="Copy Code">
                {ICONS.Copy}
                {copiedCode && <span style={{ fontSize: '0.65rem', color: 'var(--ready)', marginLeft: '2px', fontWeight: 'bold' }}>Copied!</span>}
              </button>
              <button onClick={handleShareLink} title="Copy Share Link">
                {ICONS.Share}
                {copiedLink && <span style={{ fontSize: '0.65rem', color: 'var(--ready)', marginLeft: '2px', fontWeight: 'bold' }}>Link Copied!</span>}
              </button>
              <button onClick={onReset} title="Reset Code">{ICONS.Reset}</button>
            </div>
          </>
        )}
      </div>

      <div className="navbar-right">
        {/* Layout Toggles */}
        <div className="control-group">
          <button
            className={viewMode === 'split-h' ? 'active' : ''}
            onClick={() => setViewMode('split-h')}
            title="Horizontal Split"
          >
            {ICONS.LayoutH}
          </button>
          <button
            className={viewMode === 'split-v' ? 'active' : ''}
            onClick={() => setViewMode('split-v')}
            title="Vertical Split"
          >
            {ICONS.LayoutV}
          </button>
          <button
            className={viewMode === 'editor-only' ? 'active' : ''}
            onClick={() => setViewMode('editor-only')}
            title="Editor Only"
          >
            {ICONS.ModeEditor}
          </button>
          <button
            className={viewMode === 'preview-only' ? 'active' : ''}
            onClick={() => setViewMode('preview-only')}
            title="Preview Only"
          >
            {ICONS.ModePreview}
          </button>
        </div>

        <div className="navbar-divider" />

        {/* Sidebar Toggles */}
        <div className="control-group">
          <button
            className={sidebarVisible && sidebarPosition === 'left' ? 'active' : ''}
            onClick={() => {
              setSidebarPosition('left');
              if (!sidebarVisible) setSidebarVisible(true);
            }}
            title="Sidebar Left"
          >
            {ICONS.SidebarLeft}
          </button>
          <button
            className={sidebarVisible && sidebarPosition === 'right' ? 'active' : ''}
            onClick={() => {
              setSidebarPosition('right');
              if (!sidebarVisible) setSidebarVisible(true);
            }}
            title="Sidebar Right"
          >
            {ICONS.SidebarRight}
          </button>
          <button
            className={!sidebarVisible ? 'active' : ''}
            onClick={() => setSidebarVisible(false)}
            title="Hide Sidebar"
          >
            {ICONS.SidebarHide}
          </button>
        </div>
      </div>
    </nav>
  );
}
