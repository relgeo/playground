import { lazy, startTransition, Suspense, useDeferredValue, useEffect, useRef, useState } from 'react';
// import { parseRelGeo, resolveGeometry, renderToSVG } from '@relgeo/core';
import { DEFAULT_EXAMPLE_KEY, EXAMPLES } from './examples';

// Components
import { Navbar } from './components/Navbar';
import {
  getEffectiveSheetId,
  getExportFileName,
  getNextPrintModeForSheetSelection,
} from './view-state';
import { decodeCodeFromHash, encodeCodeToHash } from './share-code';
import {
  DRAFT_STORAGE_KEY,
  SELECTED_EXAMPLE_STORAGE_KEY,
  resolveInitialPlaygroundState,
} from './persistence';
import {
  isUsingFallbackRender,
  resolveDisplayRenderState,
  type PlaygroundRenderSnapshot,
} from './playground-display-state';
import {
  getPlaygroundStatusMeta,
  getPreviewRecoveryHint,
} from './playground-status';
import {
  getNextWorkerRequestId,
  shouldApplyWorkerResponse,
} from './worker-sequencing';

import type { RelGeoDocument, ResolvedScene, RelGeoError } from '@relgeo/core';

// Types
import type { InspectorTab, DragState, ViewMode, SidebarPosition, SidebarPanels, WorkerRequest, WorkerResponse, PreviewLineMode } from './types';

const Editor = lazy(() => import('./components/Editor').then((module) => ({ default: module.Editor })));
const Preview = lazy(() => import('./components/Preview').then((module) => ({ default: module.Preview })));
const Inspector = lazy(() => import('./components/Inspector').then((module) => ({ default: module.Inspector })));
const Sidebar = lazy(() => import('./components/Sidebar').then((module) => ({ default: module.Sidebar })));
const ProfilesCard = lazy(() => import('./components/Sidebar/ProfilesCard').then((module) => ({ default: module.ProfilesCard })));
const MetaPresetsCard = lazy(() => import('./components/Sidebar/MetaPresetsCard').then((module) => ({ default: module.MetaPresetsCard })));
const ParametersCard = lazy(() => import('./components/Sidebar/ParametersCard').then((module) => ({ default: module.ParametersCard })));
const LayersCard = lazy(() => import('./components/Sidebar/LayersCard').then((module) => ({ default: module.LayersCard })));

const DEFAULT_HIDDEN_ROLES = new Set<string>(['construction']);
const MIN_PREVIEW_ZOOM = 0.01;
const MAX_PREVIEW_ZOOM = 10000;
const DEFAULT_STATIC_PREVIEW_STROKE_PX = 2;

function clampPreviewZoom(value: number): number {
  return Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, Math.round(value * 100) / 100));
}

function findSourceLineForObject(code: string, objectId: string): number {
  const candidates = Array.from(new Set([
    objectId,
    objectId.split('[')[0],
    objectId.split('.')[0],
  ].filter(Boolean)));

  return code.split('\n').findIndex((line) => {
    const trimmedLine = line.trim();
    return candidates.some((candidate) => trimmedLine.startsWith(`${candidate}:`));
  });
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) {
    throw new Error('Clipboard access is unavailable.');
  }
}

function App() {
  const [initialPlaygroundState] = useState(() => {
    let hashCode: string | null = null;
    let draftCode: string | null = null;
    let storedExampleKey: string | null = null;

    // Try to load from URL hash first
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        hashCode = decodeCodeFromHash(hash);
      } catch (e) {
        console.error('Failed to decode code from URL', e);
      }
    }

    // Try to load from localStorage draft
    try {
      draftCode = localStorage.getItem(DRAFT_STORAGE_KEY);
      storedExampleKey = localStorage.getItem(SELECTED_EXAMPLE_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to load playground persistence from localStorage', e);
    }

    return resolveInitialPlaygroundState({
      defaultExampleKey: DEFAULT_EXAMPLE_KEY,
      examples: EXAMPLES,
      hashCode,
      draftCode,
      storedExampleKey,
    });
  });
  const [selectedExample, setSelectedExample] = useState(
    initialPlaygroundState.selectedExample
  );
  const [code, setCode] = useState(initialPlaygroundState.code);
  const [error, setError] = useState<string | null>(null);
  const [errorPath, setErrorPath] = useState<string | null>(null);
  const [fullError, setFullError] = useState<RelGeoError | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [resolvedData, setResolvedData] = useState<ResolvedScene | null>(null);
  const [doc, setDoc] = useState<RelGeoDocument | null>(null);
  const [lastSuccessfulRender, setLastSuccessfulRender] =
    useState<PlaygroundRenderSnapshot | null>(null);
  const [paramOverrides, setParamOverrides] = useState<Record<string, number>>({});
  const [zoom, setZoom] = useState(100);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showAnchors, setShowAnchors] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [previewLineMode, setPreviewLineMode] = useState<PreviewLineMode>('static');
  const [hiddenRoles, setHiddenRoles] = useState<Set<string>>(new Set(DEFAULT_HIDDEN_ROLES));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('resolved');
  const [viewMode, setViewMode] = useState<ViewMode>('split-h');
  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>('right');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarPanels, setSidebarPanels] = useState<SidebarPanels>({
    parameters: true,
    profiles: false,
    metaPresets: false,
    inspector: true,
    layers: true
  });
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);
  const [dragState, setDragState] = useState<DragState>(null);
  const [splitRatio, setSplitRatio] = useState(50); // percentage for editor
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const requestFitAll = () => setFitAllTrigger((trigger) => trigger + 1);

  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const deferredCode = useDeferredValue(code);

  const handleJumpToLine = (lineNum: number) => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view;
      try {
        const line = view.state.doc.line(Math.max(1, Math.min(view.state.doc.lines, lineNum + 1)));
        view.dispatch({
          selection: { anchor: line.from, head: line.from },
          scrollIntoView: true
        });
        view.focus();
      } catch (e) {
        console.error('Failed to dispatch CodeMirror jump', e);
      }
    }
  };

  const handleJumpToObject = (objectId: string) => {
    const lineIndex = findSourceLineForObject(code, objectId);
    handleJumpToLine(lineIndex >= 0 ? lineIndex : 0);
  };

  const handleSelectObject = (objectId: string | null) => {
    setSelectedObjectId(objectId);
    if (objectId) {
      handleJumpToObject(objectId);
    }
  };

  // Sync code to URL hash and localStorage draft
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const hash = encodeCodeToHash(code);
        // Only update if it's different to avoid history bloat
        if (window.location.hash.slice(1) !== hash) {
          window.history.replaceState(null, '', `#${hash}`);
        }
      } catch (e) {
        console.error('Failed to encode code into URL hash', e);
      }
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, code);
      } catch (e) {
        console.error('Failed to save draft to localStorage', e);
      }
    }, 1000); // Debounce URL and local draft updates
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_EXAMPLE_STORAGE_KEY, selectedExample);
    } catch (e) {
      console.error('Failed to save selected example to localStorage', e);
    }
  }, [selectedExample]);

  // Resize logic
  // Sidebar Resize
  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = sidebarPosition === 'left' 
        ? Math.max(240, Math.min(600, e.clientX))
        : Math.max(240, Math.min(600, window.innerWidth - e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingSidebar(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, sidebarPosition]);

  // Split Resize
  useEffect(() => {
    if (!isResizingSplit) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.workspace-split');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let ratio;
      if (viewMode === 'split-h') {
        ratio = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        ratio = ((e.clientY - rect.top) / rect.height) * 100;
      }
      setSplitRatio(Math.max(10, Math.min(90, ratio)));
    };
    const handleMouseUp = () => setIsResizingSplit(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSplit, viewMode]);

  const displayRender = resolveDisplayRenderState({
    current: {
      doc,
      resolvedData,
      svgContent,
    },
    fallback: lastSuccessfulRender,
  });
  const displayDoc = displayRender.doc;
  const displayResolvedData = displayRender.resolvedData;
  const displaySvgContent = displayRender.svgContent;
  const isShowingFallback = isUsingFallbackRender({
    current: {
      doc,
      resolvedData,
      svgContent,
    },
    fallback: lastSuccessfulRender,
  });
  const statusMeta = getPlaygroundStatusMeta({
    hasError: error !== null,
    hasRenderablePreview: displaySvgContent !== '',
    isResolving,
    isShowingFallback,
  });
  const previewErrorHint = getPreviewRecoveryHint({
    hasError: error !== null,
    isResolving,
    isShowingFallback,
  });

  const status = statusMeta.tone;
  const hasProfiles = !!(displayDoc?.profiles && Object.keys(displayDoc.profiles).length > 0);
  const hasParameters = !!(
    displayDoc?.parameters && Object.keys(displayDoc.parameters).length > 0
  );
  const hasMetaPresets = !!(
    (displayDoc?.metaPresets && Object.keys(displayDoc.metaPresets).length > 0)
    || (displayDoc?.styles && Object.keys(displayDoc.styles).length > 0)
  );
  const resolvedObjectCount = displayResolvedData?.objects
    ? Object.keys(displayResolvedData.objects).length
    : 0;
  const resolvedValueCount = displayResolvedData?.values
    ? Object.keys(displayResolvedData.values).length
    : 0;

  const visibleSelectedObjectId = selectedObjectId && displayResolvedData?.objects?.[selectedObjectId]
    ? selectedObjectId
    : null;
  const visibleSelectedSheetId = selectedSheetId && displayDoc?.sheets?.[selectedSheetId]
    ? selectedSheetId
    : null;
  const visiblePrintMode = isPrintMode && (!selectedSheetId || visibleSelectedSheetId !== null);
  const effectiveSheetId = getEffectiveSheetId(visibleSelectedSheetId, visiblePrintMode);

  // Initialize Worker
  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      if (!shouldApplyWorkerResponse(res.requestId, latestRequestIdRef.current)) {
        return;
      }
      if (res.type === 'SUCCESS') {
        setDoc(res.data.doc);
        setResolvedData(res.data.resolvedData);
        setSvgContent(res.data.svgContent);
        setLastSuccessfulRender({
          doc: res.data.doc,
          resolvedData: res.data.resolvedData,
          svgContent: res.data.svgContent,
        });
        setError(null);
        setErrorPath(null);
        setFullError(null);
      } else {
        setError(res.error);
        setErrorPath(res.path ?? null);
        setFullError({
          message: res.error,
          path: res.path ?? null,
          objectId: res.objectId ?? null,
          dependencyChain: res.dependencyChain ?? null,
        });
        setDoc(null);
        setResolvedData(null);
        setSvgContent('');
      }
      setIsResolving(false);
    };

    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // Dispatch to Worker
  useEffect(() => {
    if (!workerRef.current) return;

    setIsResolving(true);
    const requestId = getNextWorkerRequestId(latestRequestIdRef.current);
    latestRequestIdRef.current = requestId;
    const reqPayload: WorkerRequest = {
      requestId,
      code: deferredCode,
      profile: selectedProfile,
      overrides: paramOverrides,
      selectedSheetId: effectiveSheetId,
      showDimensions: isPrintMode ? showDimensions : false,
      showAnnotations: isPrintMode ? showAnnotations : false,
      showAnchors: isPrintMode ? showAnchors : false,
      showBoundingBox: isPrintMode ? showBoundingBox : false,
      showLabels: isPrintMode ? showLabels : false,
      hiddenRoles: Array.from(hiddenRoles),
      nonScalingStroke: isPrintMode ? undefined : false,
    };
    workerRef.current.postMessage(reqPayload);
  }, [deferredCode, paramOverrides, selectedProfile, effectiveSheetId, isPrintMode, showDimensions, showAnnotations, showAnchors, showBoundingBox, showLabels, hiddenRoles]);

  const handleExampleChange = (key: string) => {
    if (code !== EXAMPLES[selectedExample].code && !window.confirm('Replace the current draft with this example?')) {
      return;
    }
    startTransition(() => {
      setSelectedExample(key);
      setCode(EXAMPLES[key].code);
      setParamOverrides({});
      setSelectedProfile(null);
      setSelectedSheetId(null);
      setIsPrintMode(false);
      setError(null);
      setErrorPath(null);
      setFullError(null);
      setInspectorTab('resolved');
      setActionFeedback(null);
      requestFitAll();
    });
  };

  const handleParamChange = (key: string, value: number) => {
    setParamOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    if (!displaySvgContent) {
      setActionFeedback({ tone: 'error', message: 'Export is unavailable until a preview is ready.' });
      return;
    }
    try {
      const blob = new Blob([displaySvgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getExportFileName(selectedExample, effectiveSheetId, isPrintMode);
      a.click();
      URL.revokeObjectURL(url);
      setActionFeedback({ tone: 'success', message: 'SVG exported.' });
    } catch (e) {
      console.error('Failed to export SVG', e);
      setActionFeedback({ tone: 'error', message: 'SVG export failed. Try again.' });
    }
  };

  const handleCopyCode = async (): Promise<boolean> => {
    try {
      await copyText(code);
      setActionFeedback({ tone: 'success', message: 'Source copied to clipboard.' });
      return true;
    } catch (e) {
      console.error('Failed to copy source', e);
      setActionFeedback({ tone: 'error', message: 'Copy failed. Check clipboard permission.' });
      return false;
    }
  };

  const handleShareLink = async (): Promise<boolean> => {
    try {
      const hash = encodeCodeToHash(code);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      await copyText(url);
      setActionFeedback({ tone: 'success', message: 'Share link copied.' });
      return true;
    } catch (e) {
      console.error('Failed to copy share link', e);
      setActionFeedback({ tone: 'error', message: 'Share link copy failed. Check clipboard permission.' });
      return false;
    }
  };

  const handleReset = () => {
    if (code !== EXAMPLES[selectedExample].code && !window.confirm('Reset the current draft to the example source?')) {
      return;
    }
    startTransition(() => {
      setCode(EXAMPLES[selectedExample].code);
      setParamOverrides({});
      setSelectedProfile(null);
      setSelectedSheetId(null);
      setIsPrintMode(false);
      requestFitAll();
      setZoom(100);
      setPan({ x: 0, y: 0 });
      setInspectorTab('resolved');
      setActionFeedback({ tone: 'success', message: 'Draft reset to the selected example.' });
      // Reset localStorage draft too
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.setItem(SELECTED_EXAMPLE_STORAGE_KEY, selectedExample);
      } catch (e) {
        console.error(e);
      }
    });
  };

  const toggleSidebarPanel = (panel: keyof SidebarPanels) => {
    setSidebarPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  return (
    <div className="playground-shell">
        <Navbar
        selectedExample={selectedExample}
        onExampleChange={handleExampleChange}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        sidebarPosition={sidebarPosition}
        setSidebarPosition={setSidebarPosition}
        status={status}
        statusLabel={statusMeta.label}
        statusDetail={statusMeta.detail}
        actionFeedback={actionFeedback}
        onCopy={handleCopyCode}
        onShareLink={handleShareLink}
        onReset={handleReset}
        zoom={zoom}
        onZoomIn={() => setZoom(z => clampPreviewZoom(z * 1.25))}
        onZoomOut={() => setZoom(z => clampPreviewZoom(z / 1.25))}
        onRecenter={requestFitAll}
        onExport={handleExport}
        doc={displayDoc}
        selectedSheetId={visibleSelectedSheetId}
        onSheetChange={(id) => {
          setSelectedSheetId(id);
          setIsPrintMode(getNextPrintModeForSheetSelection(id));
          requestFitAll();
        }}
        isPrintMode={visiblePrintMode}
        setIsPrintMode={(val) => {
          setIsPrintMode(val);
          requestFitAll();
        }}
      />

      <div className={`main-area ${sidebarPosition === 'right' ? 'sidebar-right' : ''}`}>
        <Suspense fallback={<aside className="sidebar component-loading" role="status">Loading sidebar…</aside>}>
        <Sidebar
          visible={sidebarVisible}
          position={sidebarPosition}
          panelState={sidebarPanels}
          togglePanel={toggleSidebarPanel}
          hasProfiles={hasProfiles}
          hasParameters={hasParameters}
          hasMetaPresets={hasMetaPresets}
          width={sidebarWidth}
          isResizing={isResizingSidebar}
          onResizeStart={() => setIsResizingSidebar(true)}
          onResizeKeyboard={(delta) => setSidebarWidth((width) => Math.max(240, Math.min(600, width + delta)))}
        >
          {{
            profiles: (
              <Suspense fallback={<div className="component-loading" role="status">Loading profiles…</div>}>
                <ProfilesCard
                  doc={displayDoc}
                  selectedProfile={selectedProfile}
                  setSelectedProfile={setSelectedProfile}
                  setParamOverrides={setParamOverrides}
                />
              </Suspense>
            ),
            parameters: (
              <Suspense fallback={<div className="component-loading" role="status">Loading parameters…</div>}>
                <ParametersCard
                  doc={displayDoc}
                  paramOverrides={paramOverrides}
                  onParamChange={handleParamChange}
                  onReset={() => setParamOverrides({})}
                  collapsed={false}
                  setCollapsed={() => {}}
                  resolvedValues={displayResolvedData?.values ?? {}}
                />
              </Suspense>
            ),
            metaPresets: (
              <Suspense fallback={<div className="component-loading" role="status">Loading presets…</div>}>
                <MetaPresetsCard doc={displayDoc} />
              </Suspense>
            ),
            inspector: (
              <Suspense fallback={<div className="component-loading" role="status">Loading inspector…</div>}>
              <Inspector
                tab={inspectorTab}
                setTab={setInspectorTab}
                data={displayResolvedData}
                doc={displayDoc}
                code={code}
                fullError={fullError}
                exampleName={EXAMPLES[selectedExample as keyof typeof EXAMPLES]?.name || selectedExample}
                objectCount={resolvedObjectCount}
                valueCount={resolvedValueCount}
                unit={displayDoc?.scene?.unit || 'mm'}
                selectedObjectId={visibleSelectedObjectId}
                onSelectObject={handleSelectObject}
                onJumpToLine={handleJumpToLine}
              />
              </Suspense>
            ),
            layers: (
              <Suspense fallback={<div className="component-loading" role="status">Loading layers…</div>}>
                <LayersCard hiddenRoles={hiddenRoles} setHiddenRoles={setHiddenRoles} />
              </Suspense>
            )
          }}
        </Sidebar>
        </Suspense>

        <div className={`workspace-split ${viewMode === 'split-v' ? 'is-vertical' : ''}`}>
          {viewMode !== 'preview-only' && (
            <div 
              className="split-panel editor-side" 
              style={{ flex: viewMode === 'editor-only' ? '1 1 0%' : `0 0 ${splitRatio}%` }}
            >
              <Suspense fallback={<div className="editor-loading" role="status">Loading editor…</div>}>
                <Editor code={code} onChange={setCode} editorRef={editorRef} />
              </Suspense>
            </div>
          )}

          {(viewMode === 'split-h' || viewMode === 'split-v') && (
            <div 
              className="split-resizer" 
              role="separator"
              tabIndex={0}
              aria-orientation={viewMode === 'split-v' ? 'horizontal' : 'vertical'}
              aria-valuemin={10}
              aria-valuemax={90}
              aria-valuenow={Math.round(splitRatio)}
              aria-valuetext={`${Math.round(splitRatio)}% editor space`}
              aria-label={viewMode === 'split-v' ? 'Resize editor and preview vertically' : 'Resize editor and preview horizontally'}
              onMouseDown={() => setIsResizingSplit(true)}
              onDoubleClick={() => setSplitRatio(50)}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 10 : 5;
                if (event.key === 'Home') {
                  event.preventDefault();
                  setSplitRatio(10);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  setSplitRatio(90);
                } else if ((viewMode === 'split-h' && event.key === 'ArrowLeft') || (viewMode === 'split-v' && event.key === 'ArrowUp')) {
                  event.preventDefault();
                  setSplitRatio((ratio) => Math.max(10, ratio - step));
                } else if ((viewMode === 'split-h' && event.key === 'ArrowRight') || (viewMode === 'split-v' && event.key === 'ArrowDown')) {
                  event.preventDefault();
                  setSplitRatio((ratio) => Math.min(90, ratio + step));
                }
              }}
            />
          )}

          {viewMode !== 'editor-only' && (
            <div 
              className="split-panel preview-side" 
              style={{ flex: viewMode === 'preview-only' ? '1 1 0%' : '1 1 0%' }}
            >
              <Suspense fallback={<div className="component-loading" role="status">Loading preview…</div>}>
              <Preview
                svgContent={displaySvgContent}
                zoom={zoom}
                setZoom={setZoom}
                pan={pan}
                setPan={setPan}
                onExport={handleExport}
                exampleName={EXAMPLES[selectedExample as keyof typeof EXAMPLES]?.name || selectedExample}
                objectCount={resolvedObjectCount}
                valueCount={resolvedValueCount}
                unit={displayDoc?.scene?.unit || 'mm'}
                error={error}
                errorPath={errorPath}
                errorHint={previewErrorHint}
                fullError={fullError}
                onJumpToObject={handleJumpToObject}
                violations={displayResolvedData?.violations}
                dragState={dragState}
                setDragState={setDragState}
                resolvedData={displayResolvedData}
                showDimensions={showDimensions}
                setShowDimensions={setShowDimensions}
                showAnnotations={showAnnotations}
                setShowAnnotations={setShowAnnotations}
                showAnchors={showAnchors}
                setShowAnchors={setShowAnchors}
                showLabels={showLabels}
                setShowLabels={setShowLabels}
                showBoundingBox={showBoundingBox}
                setShowBoundingBox={setShowBoundingBox}
                isPrintMode={visiblePrintMode}
                previewLineMode={previewLineMode}
                setPreviewLineMode={setPreviewLineMode}
                staticPreviewStrokePx={DEFAULT_STATIC_PREVIEW_STROKE_PX}
                hiddenRoles={hiddenRoles}
                fitAllTrigger={fitAllTrigger}
                selectedSheetId={effectiveSheetId}
                selectedObjectId={visibleSelectedObjectId}
                onSelectObject={handleSelectObject}
              />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
