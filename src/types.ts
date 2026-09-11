import type { RelGeoDocument, ResolvedScene } from '@relgeo/core';

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
}

export type WorkerResponse =
  | {
      requestId: number;
      type: 'SUCCESS';
      data: {
        doc: RelGeoDocument;
        resolvedData: ResolvedScene;
        svgContent: string;
      };
    }
  | {
      requestId: number;
      type: 'ERROR';
      error: string;
      path?: string | null;
      objectId?: string | null;
      dependencyChain?: string[] | null;
    };
