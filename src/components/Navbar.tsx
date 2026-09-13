import { useState } from 'react';
import { ICONS } from './Icons';
import type { ViewMode, SidebarPosition } from '../types';
import { EXAMPLES } from '../examples';
import { getSheetPreviewEntryLabel, getSheetPreviewEntryTarget } from '../view-state';

import type { RelGeoDocument } from '@relgeo/core';

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
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  sidebarPosition: SidebarPosition;
  setSidebarPosition: (pos: SidebarPosition) => void;
  status: 'error' | 'ready' | 'idle' | 'resolving';
  statusLabel: string;
  statusDetail?: string | null;
  // Editor actions
  onCopy: () => void | Promise<boolean>;
  onReset: () => void;
  onShareLink: () => void | Promise<boolean>;
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
  actionFeedback?: { tone: 'success' | 'error'; message: string } | null;
  isDirty: boolean;
}

export function Navbar({
  selectedExample,
  onExampleChange,
  viewMode,
  setViewMode,
  sidebarVisible,
  onOpenSidebar,
  onCloseSidebar,
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
  actionFeedback,
  isDirty,
}: NavbarProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const hasSheets = !!doc?.sheets && Object.keys(doc.sheets).length > 0;
  const selectedExampleName = EXAMPLES[selectedExample as keyof typeof EXAMPLES]?.name || selectedExample;
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

  const handleCopyCode = async () => {
    const copied = await onCopy();
    if (copied === false) return;
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = async () => {
    const copied = await onShareLink();
    if (copied === false) return;
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <span className="navbar-brand-accent">Rel</span><span>Geo</span>
        </div>
        <div className="navbar-divider" />
        <select
          className="example-select"
          aria-label="Choose example"
          title={`Current example: ${selectedExampleName}. Open to choose another example.`}
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
              aria-label="Choose preview surface"
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
        <div
          className={`status-indicator status-${status}`}
          role="status"
          aria-live="polite"
          aria-label={`${statusLabel}${statusDetail ? `: ${statusDetail}` : ''}`}
        >
          <div className="status-dot" />
          <span>{statusLabel}</span>
          {statusDetail && (
            <span className="status-detail">
              {statusDetail}
            </span>
          )}
        </div>

        {/* Preview Toolbar (Visible if Preview is not collapsed) */}
        {viewMode !== 'editor-only' && (
          <>
            <div className="navbar-divider" />
            <div className="control-group" role="group" aria-label="Preview controls">
              <span
                className={`preview-mode-label${isPrintMode ? ' is-physical' : ''}`}
                title={hasSheets
                  ? 'Preview route switches between model preview and sheet/view physical preview'
                  : 'This document is currently in model preview'}
              >
                {currentPreviewLabel}
              </span>
              {sheetPreviewEntryTarget && sheetPreviewEntryLabel && (
                <button
                  type="button"
                  onClick={() => onSheetChange(sheetPreviewEntryTarget)}
                  title="Open the first available sheet/view physical preview without changing the default model-preview entry point"
                  className="sheet-preview-entry"
                >
                  {sheetPreviewEntryLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPrintMode(!isPrintMode)} 
                title={isPrintMode ? "Switch to Model Preview" : "Switch to Physical Preview"}
                aria-pressed={isPrintMode}
                aria-label={isPrintMode ? 'Switch to model preview' : 'Switch to physical preview'}
                className={`preview-mode-toggle${isPrintMode ? ' active' : ''}`}
              >
                {ICONS.Printer}
                <span className="preview-mode-toggle-label">
                  {isPrintMode ? 'Physical' : 'Model'}
                </span>
              </button>
              <div className="navbar-divider navbar-divider-compact" />
              <button type="button" onClick={onZoomOut} title="Zoom Out" aria-label="Zoom out">{ICONS.ZoomOut}</button>
              <span className="zoom-readout" aria-live="polite" aria-label={`Zoom ${formatZoomLabel(zoom)}`}>{formatZoomLabel(zoom)}</span>
              <button type="button" onClick={onZoomIn} title="Zoom In" aria-label="Zoom in">{ICONS.ZoomIn}</button>
              <button type="button" onClick={onRecenter} title="Recenter" aria-label="Fit and recenter preview">{ICONS.Recenter}</button>
              <button type="button" onClick={onExport} title="Export SVG" aria-label="Export SVG">{ICONS.Export}</button>
            </div>
          </>
        )}

      </div>

      <div className="navbar-right">
        <details className="navbar-secondary-actions">
          <summary>More</summary>
          <div className="navbar-secondary-menu">
            <div className="navbar-menu-section">
              <span className="navbar-menu-label">Draft state</span>
              <div className="navbar-persistence-note" role="status" aria-live="polite">
                <strong>{isDirty ? 'Modified draft' : 'Selected example'}</strong>
                <span>
                  Drafts are saved only in this browser. Share links include the source in the URL hash.
                </span>
              </div>
            </div>
            {viewMode !== 'preview-only' && (
              <div className="navbar-menu-section">
                <span className="navbar-menu-label">Source actions</span>
                <div className="control-group" role="group" aria-label="Source actions">
                  <button type="button" onClick={handleCopyCode} title="Copy Code" aria-label="Copy source code">
                    {ICONS.Copy}
                    {copiedCode && <span className="navbar-action-confirmation">Copied!</span>}
                  </button>
                  <button type="button" onClick={handleShareLink} title="Copy Share Link" aria-label="Copy share link">
                    {ICONS.Share}
                    {copiedLink && <span className="navbar-action-confirmation">Link copied!</span>}
                  </button>
                  <button type="button" onClick={onReset} title="Reset Code" aria-label="Reset source code">{ICONS.Reset}</button>
                </div>
              </div>
            )}

            <div className="navbar-menu-section">
              <span className="navbar-menu-label">Sidebar placement</span>
              <div className="control-group" role="group" aria-label="Sidebar placement">
                <button
                  type="button"
                  className={sidebarVisible && sidebarPosition === 'left' ? 'active' : ''}
                  onClick={() => {
                    setSidebarPosition('left');
                    if (!sidebarVisible) onOpenSidebar();
                  }}
                  title="Sidebar Left"
                  aria-label="Show sidebar on left"
                  aria-pressed={sidebarVisible && sidebarPosition === 'left'}
                >
                  {ICONS.SidebarLeft}
                </button>
                <button
                  type="button"
                  className={sidebarVisible && sidebarPosition === 'right' ? 'active' : ''}
                  onClick={() => {
                    setSidebarPosition('right');
                    if (!sidebarVisible) onOpenSidebar();
                  }}
                  title="Sidebar Right"
                  aria-label="Show sidebar on right"
                  aria-pressed={sidebarVisible && sidebarPosition === 'right'}
                >
                  {ICONS.SidebarRight}
                </button>
                <button
                  type="button"
                  className={!sidebarVisible ? 'active' : ''}
                  onClick={onCloseSidebar}
                  title="Hide Sidebar"
                  aria-label="Hide sidebar"
                  aria-pressed={!sidebarVisible}
                >
                  {ICONS.SidebarHide}
                </button>
              </div>
            </div>
          </div>
        </details>

        {/* Layout Toggles */}
        <div className="control-group navbar-layout-group" role="group" aria-label="Workspace layout">
          <button
            type="button"
            className={viewMode === 'split-h' ? 'active' : ''}
            onClick={() => setViewMode('split-h')}
            title="Horizontal Split"
            aria-label="Horizontal split"
            aria-pressed={viewMode === 'split-h'}
          >
            {ICONS.LayoutH}
          </button>
          <button
            type="button"
            className={viewMode === 'split-v' ? 'active' : ''}
            onClick={() => setViewMode('split-v')}
            title="Vertical Split"
            aria-label="Vertical split"
            aria-pressed={viewMode === 'split-v'}
          >
            {ICONS.LayoutV}
          </button>
          <button
            type="button"
            className={viewMode === 'editor-only' ? 'active' : ''}
            onClick={() => setViewMode('editor-only')}
            title="Editor Only"
            aria-label="Editor only"
            aria-pressed={viewMode === 'editor-only'}
          >
            {ICONS.ModeEditor}
          </button>
          <button
            type="button"
            className={viewMode === 'preview-only' ? 'active' : ''}
            onClick={() => setViewMode('preview-only')}
            title="Preview Only"
            aria-label="Preview only"
            aria-pressed={viewMode === 'preview-only'}
          >
            {ICONS.ModePreview}
          </button>
        </div>

      </div>
      <div className="mobile-surface-switcher" role="group" aria-label="Mobile workspace surface">
        <button
          type="button"
          className={viewMode === 'split-h' || viewMode === 'split-v' ? 'active' : ''}
          onClick={() => setViewMode('split-h')}
          aria-pressed={viewMode === 'split-h' || viewMode === 'split-v'}
        >
          Both
        </button>
        <button
          type="button"
          className={viewMode === 'editor-only' ? 'active' : ''}
          onClick={() => setViewMode('editor-only')}
          aria-pressed={viewMode === 'editor-only'}
        >
          Source
        </button>
        <button
          type="button"
          className={viewMode === 'preview-only' ? 'active' : ''}
          onClick={() => setViewMode('preview-only')}
          aria-pressed={viewMode === 'preview-only'}
        >
          Preview
        </button>
      </div>
      <div className="action-feedback" role="status" aria-live="polite" aria-atomic="true">
        {actionFeedback?.message}
      </div>
    </nav>
  );
}
