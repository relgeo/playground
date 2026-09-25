import { lazy, startTransition, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
// import { parseRelGeo, resolveGeometry, renderToSVG } from '@relgeo/core';
import { DEFAULT_EXAMPLE_KEY, EXAMPLES } from './examples';

// Components
import { Navbar } from './components/Navbar';
import type { FileSourceValue } from './components/FileWorkspacePicker';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  getEffectiveSheetId,
  getExportFileName,
  getNextPrintModeForSheetSelection,
} from './view-state';
import { buildShareUrl, decodeCodeFromHash, encodeCodeToHash } from './share-code';
import { copyText } from './clipboard';
import {
  createEmptyWorkspace,
  createLocalDocument,
  findExampleKeyByCode,
  getUniqueDocumentName,
  parseWorkspaceBackup,
  resolveInitialPlaygroundState,
  serializeWorkspaceBackup,
  getWorkspaceStorageStats,
  type LocalWorkspace,
} from './persistence';
import {
  createWorkspaceRepository,
  WorkspacePersistenceError,
  type WorkspaceRepository,
} from './indexeddb-persistence';
import {
  isUsingFallbackRender,
  resolveDisplayRenderState,
  type PlaygroundRenderSnapshot,
} from './playground-display-state';
import {
  getPlaygroundStatusMeta,
  getPreviewRecoveryHint,
} from './playground-status';
import { getRelatedObjectIds, type InspectorDependencyGraphEntry } from './inspector-helpers';
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

interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

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

function findSourceLineForErrorPath(code: string, path: string): number {
  const segments = path.split(/[.[\]]/).filter(Boolean);
  const objectSegmentIndex = segments.lastIndexOf('objects');
  const candidates = objectSegmentIndex >= 0 && segments[objectSegmentIndex + 1]
    ? [segments[objectSegmentIndex + 1], segments[0]]
    : segments;

  return code.split('\n').findIndex((line) => {
    const trimmedLine = line.trim();
    return candidates.some((candidate) => trimmedLine.startsWith(`${candidate}:`));
  });
}

function readHashCode(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  try {
    return decodeCodeFromHash(hash);
  } catch (error) {
    console.error('Failed to decode code from URL', error);
    return null;
  }
}

function App() {
  const [initialPlaygroundState] = useState(() => {
    const hashCode = readHashCode();
    const workspace = createEmptyWorkspace();
    const initialState = resolveInitialPlaygroundState({
      defaultExampleKey: DEFAULT_EXAMPLE_KEY,
      examples: EXAMPLES,
      hashCode,
    });

    return {
      ...initialState,
      localWorkspace: workspace,
      activeDocumentId: null,
      isSharedDraft: Boolean(
        hashCode
        && !findExampleKeyByCode(hashCode, EXAMPLES),
      ),
    };
  });
  const [selectedExample, setSelectedExample] = useState(
    initialPlaygroundState.selectedExample
  );
  const [code, setCode] = useState(initialPlaygroundState.code);
  const [localWorkspace, setLocalWorkspace] = useState<LocalWorkspace>(
    initialPlaygroundState.localWorkspace,
  );
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    initialPlaygroundState.activeDocumentId,
  );
  const [isSharedDraft, setIsSharedDraft] = useState(initialPlaygroundState.isSharedDraft);
  const [error, setError] = useState<string | null>(null);
  const [errorPath, setErrorPath] = useState<string | null>(null);
  const [fullError, setFullError] = useState<RelGeoError | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [resolvedData, setResolvedData] = useState<ResolvedScene | null>(null);
  const [doc, setDoc] = useState<RelGeoDocument | null>(null);
  const [dependencyGraph, setDependencyGraph] = useState<InspectorDependencyGraphEntry[]>([]);
  const [lastSuccessfulRender, setLastSuccessfulRender] =
    useState<PlaygroundRenderSnapshot | null>(null);
  const [lastSuccessfulCode, setLastSuccessfulCode] = useState<string | null>(null);
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
  const [relationDepth, setRelationDepth] = useState(2);
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
  const [persistenceStatus, setPersistenceStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [storageEstimate, setStorageEstimate] = useState<{ usageBytes: number; quotaBytes: number } | null>(null);
  const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);
  const sidebarReturnFocusRef = useRef<HTMLElement | null>(null);
  const userChangedBeforeBootstrapRef = useRef(false);
  const [workspaceRepository] = useState<WorkspaceRepository>(() => createWorkspaceRepository());

  const openSidebar = useCallback(() => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      sidebarReturnFocusRef.current = document.activeElement;
    }
    setSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    if (
      typeof document !== 'undefined'
      && !sidebarReturnFocusRef.current
      && document.activeElement instanceof HTMLElement
      && document.activeElement.classList.contains('sidebar-backdrop')
    ) {
      sidebarReturnFocusRef.current = document.querySelector<HTMLElement>('.navbar-secondary-actions summary')
        ?? document.querySelector<HTMLElement>('.example-select');
    }
    setSidebarVisible(false);
  }, []);

  useEffect(() => {
    if (sidebarVisible || !sidebarReturnFocusRef.current || typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 840px)').matches) return;

    const element = sidebarReturnFocusRef.current;
    const frame = window.requestAnimationFrame(() => element.focus());
    sidebarReturnFocusRef.current = null;
    return () => window.cancelAnimationFrame(frame);
  }, [sidebarVisible]);

  const requestFitAll = () => setFitAllTrigger((trigger) => trigger + 1);

  const cancelConfirmation = useCallback(() => {
    setConfirmationRequest(null);
  }, []);

  const confirmConfirmation = useCallback(() => {
    const request = confirmationRequest;
    setConfirmationRequest(null);
    request?.onConfirm();
  }, [confirmationRequest]);

  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef(0);
  const requestCodeByIdRef = useRef(new Map<number, string>());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const deferredCode = useDeferredValue(code);
  const activeLocalDocument = useMemo(
    () => activeDocumentId
      ? localWorkspace.documents.find((document) => document.id === activeDocumentId) ?? null
      : null,
    [activeDocumentId, localWorkspace.documents],
  );
  const activeSource: FileSourceValue = activeLocalDocument
    ? `local:${activeLocalDocument.id}`
    : isSharedDraft
      ? 'shared:hash'
    : `example:${selectedExample}`;
  const activeSourceName = activeLocalDocument?.name
    ?? (isSharedDraft ? 'Shared draft' : null)
    ?? EXAMPLES[selectedExample as keyof typeof EXAMPLES]?.name
    ?? selectedExample;
  const isDirty = activeLocalDocument
    ? activeLocalDocument.content !== code
    : code !== EXAMPLES[selectedExample].code;
  const workspaceStats = useMemo(
    () => getWorkspaceStorageStats(localWorkspace),
    [localWorkspace],
  );

  const queueWorkspaceSave = useCallback((
    workspace: LocalWorkspace,
    successMessage?: string | null,
    errorMessage = 'Could not save the local workspace. Export a backup before continuing.',
  ) => {
    const repository = workspaceRepository;
    userChangedBeforeBootstrapRef.current = true;
    setPersistenceStatus('saving');
    void repository.save(workspace).then(() => {
      setPersistenceStatus('saved');
      if (successMessage !== undefined) {
        setActionFeedback(successMessage === null ? null : { tone: 'success', message: successMessage });
      }
    }).catch((error: unknown) => {
      const persistenceError = error instanceof WorkspacePersistenceError ? error : null;
      const suffix = persistenceError?.code === 'blocked'
        ? ' Close other playground tabs and retry.'
        : persistenceError?.code === 'quota'
          ? ' Export a backup and remove unused files.'
          : '';
      setPersistenceStatus('error');
      setActionFeedback({ tone: 'error', message: `${errorMessage}${suffix}` });
    });
  }, [workspaceRepository]);

  useEffect(() => {
    let cancelled = false;
    const bootstrapWorkspace = async () => {
      const repository = workspaceRepository;

      try {
        const storedWorkspace = await repository.load();
        if (cancelled) return;

        if (storedWorkspace && !userChangedBeforeBootstrapRef.current) {
          const activeDocument = storedWorkspace.activeDocumentId
            ? storedWorkspace.documents.find((document) => document.id === storedWorkspace.activeDocumentId) ?? null
            : null;
          const hashCode = readHashCode();
          const hashMatchesActiveDocument = Boolean(
            hashCode && activeDocument && activeDocument.content === hashCode,
          );
          const restoredCode = activeDocument
            ? (hashMatchesActiveDocument ? hashCode : activeDocument.content)
            : hashCode ?? EXAMPLES[DEFAULT_EXAMPLE_KEY].code;
          const restoredExampleKey = findExampleKeyByCode(restoredCode, EXAMPLES);

          setLocalWorkspace(storedWorkspace);
          setActiveDocumentId(activeDocument?.id ?? null);
          setIsSharedDraft(Boolean(
            hashCode
            && !activeDocument
            && !findExampleKeyByCode(hashCode, EXAMPLES),
          ));
          setCode(restoredCode);
          if (restoredExampleKey) setSelectedExample(restoredExampleKey);
        } else if (!userChangedBeforeBootstrapRef.current) {
          // A new installation starts with an empty IndexedDB workspace.
          await repository.save(initialPlaygroundState.localWorkspace);
        }
        setPersistenceStatus('saved');
      } catch (error: unknown) {
        if (!cancelled) {
          setPersistenceStatus('error');
          setActionFeedback({
            tone: 'error',
            message: error instanceof WorkspacePersistenceError && error.code === 'unavailable'
              ? 'Browser file storage is unavailable; use Backup to protect your work.'
              : 'Could not open browser file storage; use Backup to protect your work.',
          });
        }
      }
    };

    void bootstrapWorkspace();
    return () => {
      cancelled = true;
    };
  }, [initialPlaygroundState, workspaceRepository]);

  useEffect(() => {
    let cancelled = false;
    const estimateStorage = async () => {
      try {
        const estimate = await navigator.storage?.estimate();
        if (!cancelled && estimate?.usage !== undefined && estimate.quota !== undefined) {
          setStorageEstimate({ usageBytes: estimate.usage, quotaBytes: estimate.quota });
        }
      } catch (error) {
        console.warn('Browser storage estimate unavailable', error);
      }
    };
    void estimateStorage();
    return () => {
      cancelled = true;
    };
  }, [localWorkspace]);

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

  const handleJumpToErrorPath = (path: string) => {
    const lineIndex = findSourceLineForErrorPath(code, path);
    handleJumpToLine(lineIndex >= 0 ? lineIndex : 0);
  };

  const handleSelectObject = (objectId: string | null) => {
    setSelectedObjectId(objectId);
    if (objectId) {
      handleJumpToObject(objectId);
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;

      if (window.matchMedia('(max-width: 840px)').matches && sidebarVisible) {
        closeSidebar();
        return;
      }

      if (selectedObjectId) {
        setSelectedObjectId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeSidebar, selectedObjectId, sidebarVisible]);

  // Sync code to URL hash. Durable source changes are handled by the
  // IndexedDB is the only durable workspace store; localStorage is intentionally ignored.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const hash = encodeCodeToHash(code);
        const shareUrl = buildShareUrl(`${window.location.origin}${window.location.pathname}`, code);
        // Only update if it's different to avoid history bloat. Oversized source
        // stays in the editor/workspace and is intentionally not written into the URL.
        if (shareUrl && window.location.hash.slice(1) !== hash) {
          window.history.replaceState(null, '', `#${hash}`);
        }
        if (!shareUrl) {
          setActionFeedback({ tone: 'error', message: 'Draft is too large for a share link; save it as a local file for durable storage.' });
        }
      } catch (e) {
        console.error('Failed to encode code into URL hash', e);
      }
    }, 1000); // Debounce URL and local draft updates
    return () => clearTimeout(timer);
  }, [code]);

  // IndexedDB is the only durable workspace store. Share links remain
  // transient until the user explicitly saves them as a local file.
  useEffect(() => {
    if (!activeDocumentId || !activeLocalDocument || activeLocalDocument.content === code) return;

    const timer = setTimeout(() => {
      setPersistenceStatus('saving');
      const nextWorkspace: LocalWorkspace = {
        ...localWorkspace,
        documents: localWorkspace.documents.map((document) => document.id === activeDocumentId
          ? { ...document, content: code, updatedAt: Date.now() }
          : document),
      };
      setLocalWorkspace(nextWorkspace);
      queueWorkspaceSave(nextWorkspace, undefined, 'Could not save the local file. Export a backup before continuing.');
    }, 500);

    return () => clearTimeout(timer);
  }, [activeDocumentId, activeLocalDocument, code, localWorkspace, queueWorkspaceSave]);

  // Resize logic
  // Sidebar Resize
  useEffect(() => {
    if (!isResizingSidebar) return;
    const handlePointerMove = (e: PointerEvent) => {
      const newWidth = sidebarPosition === 'left' 
        ? Math.max(240, Math.min(600, e.clientX))
        : Math.max(240, Math.min(600, window.innerWidth - e.clientX));
      setSidebarWidth(newWidth);
    };
    const handlePointerUp = () => setIsResizingSidebar(false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizingSidebar, sidebarPosition]);

  // Split Resize
  useEffect(() => {
    if (!isResizingSplit) return;
    const handlePointerMove = (e: PointerEvent) => {
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
    const handlePointerUp = () => setIsResizingSplit(false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizingSplit, viewMode]);

  const displayRender = resolveDisplayRenderState({
    current: {
      doc,
      resolvedData,
      svgContent,
      dependencyGraph,
    },
    fallback: lastSuccessfulRender,
  });
  const displayDoc = displayRender.doc;
  const displayResolvedData = displayRender.resolvedData;
  const displaySvgContent = displayRender.svgContent;
  const displayDependencyGraph = displayRender.dependencyGraph;
  const isShowingFallback = isUsingFallbackRender({
    current: {
      doc,
      resolvedData,
      svgContent,
      dependencyGraph,
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
  const selectedRelatedObjectIds = useMemo(() => {
    if (!visibleSelectedObjectId || !displayDoc?.objects || !displayResolvedData?.objects) return [];

    return getRelatedObjectIds(
      displayDependencyGraph ?? [],
      visibleSelectedObjectId,
      Object.keys(displayResolvedData.objects),
      relationDepth,
    );
  }, [displayDependencyGraph, displayDoc, displayResolvedData, relationDepth, visibleSelectedObjectId]);

  // Initialize Worker
  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      const requestCode = requestCodeByIdRef.current.get(res.requestId);
      requestCodeByIdRef.current.delete(res.requestId);
      if (!shouldApplyWorkerResponse(res.requestId, latestRequestIdRef.current)) {
        return;
      }
      if (res.type === 'SUCCESS') {
        setDoc(res.data.doc);
        setResolvedData(res.data.resolvedData);
        setSvgContent(res.data.svgContent);
        setDependencyGraph(res.data.dependencyGraph);
        setLastSuccessfulRender({
          doc: res.data.doc,
          resolvedData: res.data.resolvedData,
          svgContent: res.data.svgContent,
          dependencyGraph: res.data.dependencyGraph,
        });
        if (requestCode !== undefined) {
          setLastSuccessfulCode(requestCode);
        }
        setError(null);
        setErrorPath(null);
        setFullError(null);
      } else {
        setError(res.error);
        setErrorPath(res.path ?? null);
        setFullError({
          message: res.error,
          code: res.code ?? undefined,
          path: res.path ?? null,
          objectId: res.objectId ?? null,
          dependencyChain: res.dependencyChain ?? null,
        });
        setDoc(null);
        setResolvedData(null);
        setSvgContent('');
        setDependencyGraph([]);
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
    requestCodeByIdRef.current.set(requestId, deferredCode);
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

  const applyExampleChange = (key: string) => {
    startTransition(() => {
      const nextWorkspace: LocalWorkspace = {
        ...localWorkspace,
        activeDocumentId: null,
      };
      setSelectedExample(key);
      setActiveDocumentId(null);
      setIsSharedDraft(false);
      setLocalWorkspace(nextWorkspace);
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
      queueWorkspaceSave(
        nextWorkspace,
        null,
        'Example opened, but the active file state could not be saved.',
      );
      requestFitAll();
    });
  };

  const applyLocalDocumentChange = (documentId: string) => {
    const document = localWorkspace.documents.find((item) => item.id === documentId);
    if (!document) {
      setActionFeedback({ tone: 'error', message: 'That local file is no longer available.' });
      return;
    }

    const nextWorkspace: LocalWorkspace = {
      ...localWorkspace,
      activeDocumentId: document.id,
    };
    startTransition(() => {
      setActiveDocumentId(document.id);
      setIsSharedDraft(false);
      setLocalWorkspace(nextWorkspace);
      setCode(document.content);
      setParamOverrides({});
      setSelectedProfile(null);
      setSelectedSheetId(null);
      setIsPrintMode(false);
      setError(null);
      setErrorPath(null);
      setFullError(null);
      setInspectorTab('resolved');
      setActionFeedback({ tone: 'success', message: `Opened ${document.name}.` });
      queueWorkspaceSave(
        nextWorkspace,
        `Opened ${document.name}.`,
        `Opened ${document.name}, but active-file state could not be saved.`,
      );
      requestFitAll();
    });
  };

  const handleSourceChange = (source: FileSourceValue) => {
    const nextChange = () => {
      if (source.startsWith('local:')) {
        applyLocalDocumentChange(source.slice('local:'.length));
      } else if (source.startsWith('example:')) {
        applyExampleChange(source.slice('example:'.length));
      }
    };

    if (isDirty) {
      setConfirmationRequest({
        title: 'Replace the current draft?',
        message: 'The source currently open in the editor will be replaced by the selected file.',
        confirmLabel: 'Open file',
        onConfirm: nextChange,
      });
      return;
    }
    nextChange();
  };

  const applyNewFile = () => {
    const name = getUniqueDocumentName('Untitled', localWorkspace.documents);
    const document = createLocalDocument({
      name,
      content: EXAMPLES[DEFAULT_EXAMPLE_KEY].code,
      source: 'new',
    });
    const nextWorkspace: LocalWorkspace = {
      ...localWorkspace,
      activeDocumentId: document.id,
      documents: [...localWorkspace.documents, document],
    };
    startTransition(() => {
      setLocalWorkspace(nextWorkspace);
      setActiveDocumentId(document.id);
      setIsSharedDraft(false);
      setSelectedExample(DEFAULT_EXAMPLE_KEY);
      setCode(document.content);
      setParamOverrides({});
      setSelectedProfile(null);
      setSelectedSheetId(null);
      setIsPrintMode(false);
      setError(null);
      setErrorPath(null);
      setFullError(null);
      setInspectorTab('resolved');
      setActionFeedback({ tone: 'success', message: `Created ${document.name}.` });
      queueWorkspaceSave(
        nextWorkspace,
        `Created ${document.name}.`,
        `Created ${document.name}, but it could not be saved locally.`,
      );
      requestFitAll();
    });
  };

  const handleNewFile = () => {
    if (isDirty) {
      setConfirmationRequest({
        title: 'Create a new local file?',
        message: 'The current source has unsaved editor changes and will be replaced.',
        confirmLabel: 'Create file',
        onConfirm: applyNewFile,
      });
      return;
    }
    applyNewFile();
  };

  const handleSaveAsFile = () => {
    const requestedName = activeLocalDocument
      ? `${activeLocalDocument.name} copy`
      : activeSourceName;
    const document = createLocalDocument({
      name: getUniqueDocumentName(requestedName, localWorkspace.documents),
      content: code,
      source: activeLocalDocument || isSharedDraft ? 'new' : 'example-copy',
      originExampleKey: activeLocalDocument || isSharedDraft ? undefined : selectedExample,
    });
    const nextWorkspace: LocalWorkspace = {
      ...localWorkspace,
      activeDocumentId: document.id,
      documents: [...localWorkspace.documents, document],
    };
    setLocalWorkspace(nextWorkspace);
    setActiveDocumentId(document.id);
    setIsSharedDraft(false);
    setActionFeedback({ tone: 'success', message: `Saved as ${document.name}.` });
    queueWorkspaceSave(
      nextWorkspace,
      `Saved as ${document.name}.`,
      `Saved ${document.name} in memory, but browser file storage failed.`,
    );
  };

  const handleRenameFile = () => {
    if (!activeLocalDocument) return;

    const requestedName = window.prompt('Rename local file', activeLocalDocument.name);
    if (requestedName === null) return;
    if (!requestedName.trim()) {
      setActionFeedback({ tone: 'error', message: 'A local file name cannot be empty.' });
      return;
    }

    const nextName = getUniqueDocumentName(
      requestedName,
      localWorkspace.documents,
      activeLocalDocument.id,
    );
    const nextWorkspace: LocalWorkspace = {
      ...localWorkspace,
      documents: localWorkspace.documents.map((document) => document.id === activeLocalDocument.id
        ? { ...document, name: nextName, updatedAt: Date.now() }
        : document),
    };
    setLocalWorkspace(nextWorkspace);
    setActionFeedback({ tone: 'success', message: `Renamed to ${nextName}.` });
    queueWorkspaceSave(
      nextWorkspace,
      `Renamed to ${nextName}.`,
      `Renamed to ${nextName}, but browser file storage failed.`,
    );
  };

  const applyDeleteFile = () => {
    if (!activeLocalDocument) return;

    const remainingDocuments = localWorkspace.documents.filter(
      (document) => document.id !== activeLocalDocument.id,
    );
    const nextDocument = [...remainingDocuments].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
    const nextWorkspace: LocalWorkspace = {
      ...localWorkspace,
      activeDocumentId: nextDocument?.id ?? null,
      documents: remainingDocuments,
    };
    setLocalWorkspace(nextWorkspace);
    setActiveDocumentId(nextDocument?.id ?? null);
    setIsSharedDraft(false);
    if (nextDocument) {
      setCode(nextDocument.content);
    } else {
      setSelectedExample(DEFAULT_EXAMPLE_KEY);
      setCode(EXAMPLES[DEFAULT_EXAMPLE_KEY].code);
    }
    setParamOverrides({});
    setSelectedProfile(null);
    setSelectedSheetId(null);
    setIsPrintMode(false);
    setError(null);
    setErrorPath(null);
    setFullError(null);
    setActionFeedback({ tone: 'success', message: `Deleted ${activeLocalDocument.name}.` });
    queueWorkspaceSave(
      nextWorkspace,
      `Deleted ${activeLocalDocument.name}.`,
      `Deleted ${activeLocalDocument.name} in memory, but browser file storage failed.`,
    );
    requestFitAll();
  };

  const handleDeleteFile = () => {
    if (!activeLocalDocument) return;
    setConfirmationRequest({
      title: `Delete ${activeLocalDocument.name}?`,
      message: 'This removes the local file from this browser. Download a backup first if you may need it later.',
      confirmLabel: 'Delete file',
      onConfirm: applyDeleteFile,
    });
  };

  const applyRestoreWorkspace = (workspace: LocalWorkspace) => {
    const restoredDocument = workspace.activeDocumentId
      ? workspace.documents.find((document) => document.id === workspace.activeDocumentId) ?? null
      : null;
    const restoredExampleKey = restoredDocument
      ? findExampleKeyByCode(restoredDocument.content, EXAMPLES) ?? DEFAULT_EXAMPLE_KEY
      : DEFAULT_EXAMPLE_KEY;
    setLocalWorkspace(workspace);
    setActiveDocumentId(restoredDocument?.id ?? null);
    setIsSharedDraft(false);
    setSelectedExample(restoredExampleKey);
    setCode(restoredDocument?.content ?? EXAMPLES[restoredExampleKey].code);
    setParamOverrides({});
    setSelectedProfile(null);
    setSelectedSheetId(null);
    setIsPrintMode(false);
    setError(null);
    setErrorPath(null);
    setFullError(null);
    setInspectorTab('resolved');
    const successMessage = `Restored ${workspace.documents.length} local file${workspace.documents.length === 1 ? '' : 's'}.`;
    setActionFeedback({ tone: 'success', message: successMessage });
    queueWorkspaceSave(
      workspace,
      successMessage,
      'Workspace restored in memory, but could not be saved to browser storage.',
    );
    requestFitAll();
  };

  const handleBackupWorkspace = () => {
    try {
      const blob = new Blob([serializeWorkspaceBackup(localWorkspace)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `relgeo-playground-workspace-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionFeedback({ tone: 'success', message: 'Workspace backup downloaded.' });
    } catch (error) {
      console.error('Failed to download workspace backup', error);
      setActionFeedback({ tone: 'error', message: 'Workspace backup failed. Try again.' });
    }
  };

  const handleRestoreWorkspace = async (file: File) => {
    if (!/\.json$/i.test(file.name)) {
      setActionFeedback({ tone: 'error', message: 'Restore accepts a .json workspace backup.' });
      return;
    }
    if (file.size > 5_000_000) {
      setActionFeedback({ tone: 'error', message: 'This workspace backup is larger than the 5 MB limit.' });
      return;
    }

    try {
      const workspace = parseWorkspaceBackup(await file.text());
      if (!workspace) {
        setActionFeedback({ tone: 'error', message: 'That workspace backup is invalid or unsupported.' });
        return;
      }
      setConfirmationRequest({
        title: 'Restore this workspace?',
        message: `This will replace the current My Files list with ${workspace.documents.length} file${workspace.documents.length === 1 ? '' : 's'} from the backup.`,
        confirmLabel: 'Restore workspace',
        onConfirm: () => applyRestoreWorkspace(workspace),
      });
    } catch (error) {
      console.error('Failed to read workspace backup', error);
      setActionFeedback({ tone: 'error', message: 'Could not read that workspace backup.' });
    }
  };

  const handleImportFile = async (file: File) => {
    if (!/\.ya?ml$/i.test(file.name)) {
      setActionFeedback({ tone: 'error', message: 'Import accepts .yaml or .yml files.' });
      return;
    }
    if (file.size > 1_000_000) {
      setActionFeedback({ tone: 'error', message: 'This file is larger than the 1 MB local-file limit.' });
      return;
    }

    try {
      const content = await file.text();
      const document = createLocalDocument({
        name: getUniqueDocumentName(file.name, localWorkspace.documents),
        content,
        source: 'imported',
      });
      const nextWorkspace: LocalWorkspace = {
        ...localWorkspace,
        activeDocumentId: document.id,
        documents: [...localWorkspace.documents, document],
      };
      setLocalWorkspace(nextWorkspace);
      setActiveDocumentId(document.id);
      setIsSharedDraft(false);
      setCode(content);
      setSelectedExample(findExampleKeyByCode(content, EXAMPLES) ?? DEFAULT_EXAMPLE_KEY);
      setParamOverrides({});
      setSelectedProfile(null);
      setSelectedSheetId(null);
      setIsPrintMode(false);
      setError(null);
      setErrorPath(null);
      setFullError(null);
      setInspectorTab('resolved');
      setActionFeedback({ tone: 'success', message: `Imported ${document.name}.` });
      queueWorkspaceSave(
        nextWorkspace,
        `Imported ${document.name}.`,
        `Opened ${document.name}, but browser file storage failed.`,
      );
      requestFitAll();
    } catch (error) {
      console.error('Failed to import source file', error);
      setActionFeedback({ tone: 'error', message: 'Could not read that YAML file.' });
    }
  };

  const handleDownloadFile = () => {
    try {
      const blob = new Blob([code], { type: 'application/yaml' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${activeSourceName.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'untitled'}.yaml`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionFeedback({ tone: 'success', message: 'Source downloaded as YAML.' });
    } catch (error) {
      console.error('Failed to download source', error);
      setActionFeedback({ tone: 'error', message: 'Source download failed. Try again.' });
    }
  };

  const handleParamChange = (key: string, value: number) => {
    setParamOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const applyRestoreLastSuccessful = (codeToRestore: string) => {
    setCode(codeToRestore);
    setSelectedObjectId(null);
    setError(null);
    setErrorPath(null);
    setFullError(null);
    setActionFeedback({ tone: 'success', message: 'Restored the last successful draft.' });
  };

  const handleRestoreLastSuccessful = () => {
    const codeToRestore = lastSuccessfulCode;
    if (!codeToRestore || codeToRestore === code) {
      setActionFeedback({ tone: 'error', message: 'No earlier successful draft is available to restore.' });
      return;
    }
    setConfirmationRequest({
      title: 'Restore the last successful draft?',
      message: 'The current source will be replaced with the last draft that resolved successfully.',
      confirmLabel: 'Restore draft',
      onConfirm: () => applyRestoreLastSuccessful(codeToRestore),
    });
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
      const url = buildShareUrl(`${window.location.origin}${window.location.pathname}`, code);
      if (!url) {
        setActionFeedback({ tone: 'error', message: 'Share link unavailable: this draft is too large.' });
        return false;
      }
      await copyText(url);
      setActionFeedback({ tone: 'success', message: 'Share link copied.' });
      return true;
    } catch (e) {
      console.error('Failed to copy share link', e);
      setActionFeedback({ tone: 'error', message: 'Share link copy failed. Check clipboard permission.' });
      return false;
    }
  };

  const applyReset = () => {
    startTransition(() => {
      setCode(activeLocalDocument?.content ?? EXAMPLES[selectedExample].code);
      setParamOverrides({});
      setSelectedProfile(null);
      setSelectedSheetId(null);
      setIsPrintMode(false);
      requestFitAll();
      setZoom(100);
      setPan({ x: 0, y: 0 });
      setInspectorTab('resolved');
      setActionFeedback({
        tone: 'success',
        message: activeLocalDocument
          ? `Draft reset to the last saved version of ${activeLocalDocument.name}.`
          : 'Draft reset to the selected example.',
      });
    });
  };

  const handleReset = () => {
    if (isDirty) {
      setConfirmationRequest({
        title: 'Reset the current draft?',
        message: 'Your current source will be replaced with the selected example.',
        confirmLabel: 'Reset draft',
        onConfirm: applyReset,
      });
      return;
    }
    applyReset();
  };

  const handleEditorChange = useCallback((nextCode: string) => {
    userChangedBeforeBootstrapRef.current = true;
    setCode(nextCode);
  }, []);

  const toggleSidebarPanel = (panel: keyof SidebarPanels) => {
    setSidebarPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  return (
    <>
    <div className="playground-shell" aria-hidden={confirmationRequest ? true : undefined}>
      {viewMode !== 'preview-only' && (
        <a className="skip-link" href="#relgeo-editor">Skip to editor</a>
      )}
      {viewMode !== 'editor-only' && (
        <a className="skip-link" href="#relgeo-preview">Skip to preview</a>
      )}
        <Navbar
        activeSource={activeSource}
        localDocuments={localWorkspace.documents}
        onSourceChange={handleSourceChange}
        onNewFile={handleNewFile}
        onSaveAsFile={handleSaveAsFile}
        onRenameFile={handleRenameFile}
        onDeleteFile={handleDeleteFile}
        onBackupWorkspace={handleBackupWorkspace}
        onRestoreWorkspace={handleRestoreWorkspace}
        onImportFile={handleImportFile}
        onDownloadFile={handleDownloadFile}
        activeSourceName={activeSourceName}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sidebarVisible={sidebarVisible}
        onOpenSidebar={openSidebar}
        onCloseSidebar={closeSidebar}
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
        isDirty={isDirty}
        persistenceStatus={persistenceStatus}
        workspaceStats={workspaceStats}
        storageEstimate={storageEstimate}
      />

      <main className={`main-area ${sidebarPosition === 'right' ? 'sidebar-right' : ''}`}>
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
          onClose={closeSidebar}
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
                exampleName={activeSourceName}
                objectCount={resolvedObjectCount}
                valueCount={resolvedValueCount}
                unit={displayDoc?.scene?.unit || 'mm'}
                selectedObjectId={visibleSelectedObjectId}
                relatedObjectIds={selectedRelatedObjectIds}
                relatedDepth={relationDepth}
                onRelatedDepthChange={setRelationDepth}
                onSelectObject={handleSelectObject}
                onJumpToLine={handleJumpToLine}
                onJumpToPath={handleJumpToErrorPath}
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
              id="relgeo-editor"
              tabIndex={-1}
              aria-label="RelGeo source editor"
              className={`split-panel editor-side ${viewMode === 'editor-only' ? 'is-editor-only' : ''}`}
              style={viewMode === 'editor-only' ? undefined : { flex: `0 0 ${splitRatio}%` }}
            >
              <Suspense fallback={<div className="editor-loading" role="status">Loading editor…</div>}>
                <Editor code={code} onChange={handleEditorChange} editorRef={editorRef} />
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
              onPointerDown={() => setIsResizingSplit(true)}
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
              id="relgeo-preview"
              tabIndex={-1}
              aria-label="RelGeo preview"
              className="split-panel preview-side"
            >
              <Suspense fallback={<div className="component-loading" role="status">Loading preview…</div>}>
              <Preview
                svgContent={displaySvgContent}
                zoom={zoom}
                setZoom={setZoom}
                pan={pan}
                setPan={setPan}
                onExport={handleExport}
                exampleName={activeSourceName}
                objectCount={resolvedObjectCount}
                valueCount={resolvedValueCount}
                unit={displayDoc?.scene?.unit || 'mm'}
                error={error}
                errorPath={errorPath}
                errorHint={previewErrorHint}
                fullError={fullError}
                onJumpToObject={handleJumpToObject}
                onJumpToPath={handleJumpToErrorPath}
                isShowingFallback={isShowingFallback}
                onRestoreLastSuccessful={handleRestoreLastSuccessful}
                onReset={handleReset}
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
                onFitAll={requestFitAll}
                selectedSheetId={effectiveSheetId}
                selectedObjectId={visibleSelectedObjectId}
                relatedObjectIds={selectedRelatedObjectIds}
                onSelectObject={handleSelectObject}
              />
              </Suspense>
            </div>
          )}
        </div>
      </main>
    </div>
    <ConfirmDialog
      open={confirmationRequest !== null}
      title={confirmationRequest?.title ?? ''}
      message={confirmationRequest?.message ?? ''}
      confirmLabel={confirmationRequest?.confirmLabel ?? 'Confirm'}
      onConfirm={confirmConfirmation}
      onCancel={cancelConfirmation}
    />
    </>
  );
}

export default App;
