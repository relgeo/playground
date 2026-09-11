import { describe, expect, it } from 'vitest';
import { processWorkerRequest } from '../worker';
import { EXAMPLES } from '../examples';

const validDoc = `version: 0.5
objects:
  panel:
    type: rect
    size: [120mm, 80mm]
`;

const invalidDoc = `version: 0.5
objects:
  broken:
    type: rect
    size: [missingWidth, 80mm]
`;

const constructionDoc = `version: 0.5
objects:
  buildLine:
    type: line
    from: [0, 0]
    to: [100, 0]
    meta:
      role: construction
`;

const targetOnlyAnnotationDoc = `version: 0.5
objects:
  hole:
    type: circle
    center: [50, 50]
    radius: 10
  note:
    type: annotation
    target: hole
    text: M6 clearance
`;

const scaledSheetDoc = `version: 0.5
objects:
  panel:
    type: rect
    size: [100, 50]
    place:
      topLeft: [100, 20]

views:
  front:
    target: panel
    scale: "1:2"

sheets:
  drawing1:
    size: A4
    views:
      - use: front
        place:
          topLeft: [20, 30]
`;

const titleBlockMetaDoc = `version: 0.5
meta:
  version: DOC-2026.07
  date: "2026-07-13"

objects:
  panel:
    type: rect
    size: [100, 50]

views:
  front:
    target: panel
    scale: 1

sheets:
  drawing1:
    size: A4
    meta:
      title: Assembly Sheet
      sheetSize: A4 Landscape
    views:
      - use: front
        place:
          topLeft: [20, 30]
  drawing2:
    size: A4
    meta:
      title: Detail Sheet
      version: DOC-DET-02
      date: "2026-07-14"
      sheetSize: A4 Landscape
    views:
      - use: front
        place:
          topLeft: [40, 45]
`;

const multilineTextDoc = `version: 0.5
objects:
  title:
    type: text
    at: [80, 40]
    anchor: center
    content: "Short\\nMuch longer line\\nMid"
    meta:
      fontSize: 12
      lineHeight: 1.2
`;

const previewStrokeDoc = `version: 0.5
scene:
  unit: m
  autoSize: true
  padding: 2

objects:
  frame:
    type: rect
    size: [10, 10]
    place:
      left: 0
      top: 0
    meta:
      stroke: "#111827"
`;

describe('playground worker contract', () => {
  it('returns SUCCESS for valid input', () => {
    const result = processWorkerRequest({
      code: validDoc,
      overrides: {},
      hiddenRoles: [],
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.doc.objects.panel).toBeDefined();
      expect(result.data.resolvedData.objects.panel).toBeDefined();
      expect(result.data.svgContent).toContain('<svg');
    }
  });

  it('processes the split example through the playground worker', () => {
    const result = processWorkerRequest({
      code: EXAMPLES.split.code,
      overrides: {},
      hiddenRoles: [],
    });

    if (result.type === 'ERROR') {
      throw new Error(result.error);
    }
    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.resolvedData.objects.split_outline).toBeDefined();
      expect(result.data.resolvedData.objects['split_outline[0]']).toBeDefined();
      expect(result.data.resolvedData.objects['split_outline[1]']).toBeDefined();
      expect(result.data.svgContent).toContain('first(split_outline)');
      expect(result.data.svgContent).toContain('last(split_outline)');
    }
  });

  it('returns ERROR for invalid input', () => {
    const result = processWorkerRequest({
      code: invalidDoc,
      overrides: {},
      hiddenRoles: [],
    });

    expect(result.type).toBe('ERROR');
    if (result.type === 'ERROR') {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('hides construction by default when hiddenRoles is not provided', () => {
    const result = processWorkerRequest({
      code: constructionDoc,
      overrides: {},
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.svgContent).not.toContain('role-construction');
      expect(result.data.svgContent).not.toContain('id="buildLine"');
    }
  });

  it('allows construction to be shown when hiddenRoles is explicitly empty', () => {
    const result = processWorkerRequest({
      code: constructionDoc,
      overrides: {},
      hiddenRoles: [],
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.svgContent).toContain('role-construction');
      expect(result.data.svgContent).toContain('id="buildLine"');
    }
  });

  it('renders target-only annotation with fallback placement in playground worker output', () => {
    const result = processWorkerRequest({
      code: targetOnlyAnnotationDoc,
      overrides: {},
      hiddenRoles: [],
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.svgContent).toContain('dominant-baseline="hanging"');
      expect(result.data.svgContent).toContain('M6 clearance');
      expect(result.data.svgContent).toContain('<text x="');
    }
  });

  it('uses resolved view bbox framing for scaled sheet rendering in playground worker output', () => {
    const result = processWorkerRequest({
      code: scaledSheetDoc,
      overrides: {},
      selectedSheetId: 'drawing1',
      hiddenRoles: [],
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.svgContent).toContain(
        'transform="translate(20, 30) scale(0.5) translate(-100, -20)"'
      );
    }
  });

  it('renders sheet title block metadata and supports multiple sheets in playground worker output', () => {
    const firstSheet = processWorkerRequest({
      code: titleBlockMetaDoc,
      overrides: {},
      selectedSheetId: 'drawing1',
      hiddenRoles: [],
    });

    expect(firstSheet.type).toBe('SUCCESS');
    if (firstSheet.type === 'SUCCESS') {
      expect(firstSheet.data.svgContent).toContain('SHEET: Assembly Sheet');
      expect(firstSheet.data.svgContent).toContain('RELGEO: v0.5');
      expect(firstSheet.data.svgContent).toContain('DATE: 2026-07-13');
      expect(firstSheet.data.svgContent).toContain('DOC VER: DOC-2026.07');
      expect(firstSheet.data.svgContent).toContain('SIZE: A4 Landscape');
    }

    const secondSheet = processWorkerRequest({
      code: titleBlockMetaDoc,
      overrides: {},
      selectedSheetId: 'drawing2',
      hiddenRoles: [],
    });

    expect(secondSheet.type).toBe('SUCCESS');
    if (secondSheet.type === 'SUCCESS') {
      expect(secondSheet.data.svgContent).toContain('SHEET: Detail Sheet');
      expect(secondSheet.data.svgContent).toContain('RELGEO: v0.5');
      expect(secondSheet.data.svgContent).toContain('DATE: 2026-07-14');
      expect(secondSheet.data.svgContent).toContain('DOC VER: DOC-DET-02');
      expect(secondSheet.data.svgContent).toContain('SIZE: A4 Landscape');
      expect(secondSheet.data.svgContent).toContain('transform="translate(40, 45) scale(1) translate(0, 0)"');
    }
  });

  it('measures multiline text by longest line in playground worker resolution', () => {
    const result = processWorkerRequest({
      code: multilineTextDoc,
      overrides: {},
      hiddenRoles: [],
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      const title = result.data.resolvedData.objects.title as {
        x: number;
        y: number;
        width: number;
        height: number;
      };

      expect(title.width).toBeGreaterThan(100);
      expect(title.height).toBeCloseTo(43.2, 6);
      expect(title.x).toBeCloseTo(80 - title.width / 2, 6);
      expect(title.y).toBeCloseTo(40 - title.height / 2, 6);
    }
  });

  it('supports active v0.5 docs with metaPresets and repeat.along in playground worker output', () => {
    const v05Doc = `version: 0.5
metaPresets:
  finalStroke:
    role: final
    stroke: "#111827"
    strokeWidth: 1.2
  guideStroke:
    role: guide
    stroke: "#94a3b8"
    dash: "4 2"

objects:
  guide:
    type: path
    points:
      - [0, 0]
      - [40, 0]
      - [80, 20]
    metaPreset: guideStroke

  marks:
    type: repeat
    along:
      target: guide
      count: 3
      spacing: uniform-length
    item:
      type: circle
      radius: 2
      center: item.point
      meta:
        intent: inspection-mark
        inherit: finalStroke
`;

    const result = processWorkerRequest({
      code: v05Doc,
      overrides: {},
      hiddenRoles: [],
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.doc.metaPresets?.finalStroke).toBeDefined();
      expect(result.data.resolvedData.objects['marks[1]']).toBeDefined();
      expect(result.data.svgContent).toContain('<svg');
    }
  });

  it('allows model preview worker output to disable non-scaling stroke for manual preview line handling', () => {
    const result = processWorkerRequest({
      code: previewStrokeDoc,
      overrides: {},
      hiddenRoles: [],
      nonScalingStroke: false,
    });

    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.svgContent).toContain('data-preview-stroke="visible"');
      expect(result.data.svgContent).not.toContain('vector-effect="non-scaling-stroke"');
    }
  });

  it('resolves the onboarding path_join example through the playground worker', () => {
    const result = processWorkerRequest({
      code: EXAMPLES.path_join.code,
      overrides: {},
      hiddenRoles: [],
    });

    if (result.type === 'ERROR') {
      throw new Error(result.error);
    }
    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.resolvedData.objects.outline).toBeDefined();
      expect(result.data.resolvedData.objects.panel).toBeDefined();
      expect(result.data.resolvedData.values.outlineLength).toBeGreaterThan(0);
      expect(result.data.resolvedData.values.panelArea).toBeGreaterThan(0);
      expect(result.data.svgContent).toContain('Path Join + Reverse + closeWith');
    }
  });

  it('resolves the joined bracket detail example through the playground worker', () => {
    const result = processWorkerRequest({
      code: EXAMPLES.v05_joined_bracket_detail.code,
      overrides: {},
      hiddenRoles: [],
    });

    if (result.type === 'ERROR') {
      throw new Error(result.error);
    }
    expect(result.type).toBe('SUCCESS');
    if (result.type === 'SUCCESS') {
      expect(result.data.resolvedData.objects.profile).toBeDefined();
      expect(result.data.resolvedData.objects.center_hole).toBeDefined();
      expect(result.data.resolvedData.values.profileLength).toBeGreaterThan(0);
      expect(result.data.resolvedData.values.profileArea).toBeGreaterThan(0);
      expect(result.data.svgContent).toContain('Joined Bracket Detail');
      expect(result.data.svgContent).toContain('Main fastener hole');
    }
  });
});
