import type { RelGeoDocument, ResolvedScene } from '@relgeo/core';
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

export interface WorkerRequest {
  requestId: number;
  code: string;
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
}

export type WorkerResponse =
  | {
      requestId: number;
      type: 'SUCCESS';
      readiness: 'resolve-ready';
      recoveryState: WorkerRecoveryState;
      data: {
        doc: RelGeoDocument;
        resolvedData: ResolvedScene;
        svgContent: string;
        dependencyGraph: InspectorDependencyGraphEntry[];
      };
    }
  | {
      requestId: number;
      type: 'ERROR';
      readiness: WorkerReadiness;
      recoveryState: WorkerRecoveryState;
      error: string;
      code?: string | null;
      path?: string | null;
      objectId?: string | null;
      dependencyChain?: string[] | null;
    };
