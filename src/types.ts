import type { RelGeoDocument, ResolvedScene } from '@relgeo/core';
import type { AnalysisResult, PreviousAnalysisState, ResultProvenance } from '@relgeo/language-service';
import type { InspectorDependencyGraphEntry } from './inspector-helpers';

export type InspectorTab = 'resolved' | 'values' | 'errors' | 'graph' | 'bom';
export type DragState = { startX: number; startY: number; originX: number; originY: number } | null;
export type ViewMode = 'split-h' | 'split-v' | 'editor-only' | 'preview-only';
export type SidebarPosition = 'left' | 'right';
export type PreviewLineMode = 'static' | 'physical-relative' | 'adaptive';
export interface SidebarPanels {
  parameters: boolean;
  profiles: boolean;
  metaPresets: boolean;
  inspector: boolean;
  layers: boolean;
}

export interface OverlayConfig {
  showAnchors: boolean;
  showBoundingBoxes: boolean;
  showLabels: boolean;
  showSegments: boolean;
}

export type WorkerReadiness = 'invalid' | 'partial' | 'structurally-valid' | 'semantically-valid' | 'resolve-ready';
export type WorkerRecoveryState = 'invalid' | 'partial' | 'recovered' | 'stable';

export interface WorkerDocumentIdentity {
  /** Host-owned document identity; source text is never used as identity. */
  documentId: string;
  /** Monotonic version for the active document identity. */
  version: number;
  /** Worker request sequence used to reject out-of-order responses. */
  requestId: number;
}

export interface WorkerRequest extends WorkerDocumentIdentity {
  code: string;
  /** Optional source revision/provenance forwarded into the typed analysis result. */
  sourceRevision?: string;
  provenance?: ResultProvenance[];
  profile?: string | null;
  overrides?: Record<string, number>;
  selectedSheetId?: string | null;
  showDimensions?: boolean;
  showAnnotations?: boolean;
  showAnchors?: boolean;
  showBoundingBox?: boolean;
  showLabels?: boolean;
  hiddenRoles?: string[];
  nonScalingStroke?: boolean;
  /** Previous response state lets the worker distinguish a recovery from a stable render. */
  previousRecoveryState?: WorkerRecoveryState;
  /** Previous same-document language-service state keeps recovery stateless and serializable. */
  previousAnalysis?: PreviousAnalysisState;
}

export type WorkerResponse =
  | {
      documentId: string;
      version: number;
      requestId: number;
      type: 'SUCCESS';
      readiness: 'resolve-ready';
      recoveryState: WorkerRecoveryState;
      analysis: AnalysisResult;
      data: {
        doc: RelGeoDocument;
        resolvedData: ResolvedScene;
        svgContent: string;
        dependencyGraph: InspectorDependencyGraphEntry[];
      };
    }
  | {
      documentId: string;
      version: number;
      requestId: number;
      type: 'ERROR';
      readiness: WorkerReadiness;
      recoveryState: WorkerRecoveryState;
      analysis: AnalysisResult;
      error: string;
      code?: string | null;
      path?: string | null;
      objectId?: string | null;
      dependencyChain?: string[] | null;
    };
