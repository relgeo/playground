import fundamentalsCode from './assets/examples/basics/01_fundamentals.yaml?raw';
import ellipseBasicsCode from './assets/examples/basics/02_ellipse_basics.yaml?raw';
import pathJoinCode from './assets/examples/basics/03_path_join.yaml?raw';
import splitCode from './assets/examples/basics/04_split.yaml?raw';
import booleanCsgCode from './assets/examples/basics/v04_boolean_csg.yaml?raw';
import architecturalPlanCode from './assets/examples/architecture/v04_architectural_plan.yaml?raw';
import electronicFaceplateCode from './assets/examples/mechanical/v04_electronic_faceplate.yaml?raw';
import sheetsCode from './assets/examples/mechanical/v04_technical_drawing_sheets.yaml?raw';
import bodiceBlockCode from './assets/examples/fashion/bodice_block.yaml?raw';

import v02ShowcaseCode from './assets/examples/showcases/v02_showcase.yaml?raw';
import v03ShowcaseCode from './assets/examples/showcases/v03_showcase.yaml?raw';
import v03HolesCode from './assets/examples/showcases/v03_holes.yaml?raw';
import v04ShowcaseCode from './assets/examples/showcases/v04_showcase.yaml?raw';

import v04FlangeCode from './assets/examples/mechanical/v04_flange.yaml?raw';
import v04RepeatAlongPathCode from './assets/examples/mechanical/v04_repeat_along_path.yaml?raw';
import v04FullAssemblyCode from './assets/examples/mechanical/v04_full_assembly.yaml?raw';
import v05JoinedBracketDetailCode from './assets/examples/mechanical/v05_joined_bracket_detail.yaml?raw';

export const DEFAULT_EXAMPLE_KEY = 'architectural_plan';

export const EXAMPLES: Record<
  string,
  { name: string; category: string; summary: string; code: string }
> = {
  // Active onboarding examples for the current v0.5-facing surface.
  fundamentals: {
    name: '01. Fundamentals',
    category: 'Basics',
    summary: 'An introduction to core RelGeo v0.5 drafting flow: basic shapes, positioning, anchoring, and clones.',
    code: fundamentalsCode,
  },
  boolean_csg: {
    name: '03. Boolean CSG',
    category: 'Basics',
    summary: 'Demonstration of active Boolean Constructive Solid Geometry (union, subtract, intersect).',
    code: booleanCsgCode,
  },
  ellipse_basics: {
    name: '02. Ellipse Basics',
    category: 'Basics',
    summary: 'Introduction to ellipse as an active v0.5 primitive: radii, size, rotation, pointAt, area, and holes.',
    code: ellipseBasicsCode,
  },
  path_join: {
    name: '03. Path Join',
    category: 'Basics',
    summary: 'Compose reusable path-like geometry with path.join, explicit reverse, and closeWith.',
    code: pathJoinCode,
  },
  split: {
    name: '04. Split',
    category: 'Basics',
    summary: 'Split an open path-like target at an explicit point, then use first/last collection results or pick a single path.',
    code: splitCode,
  },
  architectural_plan: {
    name: 'Architectural Floor Plan',
    category: 'Architecture',
    summary: 'A complete floor plan using active Components, Dimensions, and Layout.',
    code: architecturalPlanCode,
  },
  electronic_faceplate: {
    name: 'Electronic Faceplate',
    category: 'Mechanical',
    summary: 'A complex mechanical faceplate using Boolean operations, Repeat for ventilation, and Dimensions.',
    code: electronicFaceplateCode,
  },
  technical_sheets: {
    name: 'Technical Drawing Sheets',
    category: 'Mechanical',
    summary: 'Example of active Sheets and Views for professional technical drawing layouts, including ellipse-based bracket features.',
    code: sheetsCode,
  },
  bodice_block: {
    name: 'Bodice Block (Pola Dasar)',
    category: 'Fashion',
    summary: 'Pola dasar badan wanita parametrik (bust, waist, dsb.) dengan kerung bezier dan layout printing.',
    code: bodiceBlockCode,
  },
  v04_flange: {
    name: 'Mechanical Flange (Polar Repeat)',
    category: 'Mechanical',
    summary: 'Flange mekanikal dengan lubang baut polar repeat, dimensi radius/diameter.',
    code: v04FlangeCode,
  },
  v04_repeat_along_path: {
    name: 'Repeat Along Path (Oriented Patterns)',
    category: 'Mechanical',
    summary: 'Oriented placement sejajar kurva kuadratik (quadratic) dan kubik (cubic).',
    code: v04RepeatAlongPathCode,
  },
  v04_full_assembly: {
    name: 'Full Assembly',
    category: 'Mechanical',
    summary: 'Flagship example untuk surface aktif: Reusable Component (parametrik), Divide, dan Layout Sheet.',
    code: v04FullAssemblyCode,
  },
  v05_joined_bracket_detail: {
    name: 'Joined Bracket Detail',
    category: 'Mechanical',
    summary: 'Technical drawing flavored example using path.join, explicit reverse, dimensions, and annotation.',
    code: v05JoinedBracketDetailCode,
  },
  // Historical showcases remain available for reference, but are not the primary onboarding path.
  v02_showcase: {
    name: 'Historical: v0.2 Delta Showcase',
    category: 'Historical Showcases',
    summary: 'Referensi historis untuk melihat lompatan fitur v0.2 seperti Polar Move, Intersection, Path, dan Text.',
    code: v02ShowcaseCode,
  },
  v03_showcase: {
    name: 'Historical: v0.3 Delta Showcase',
    category: 'Historical Showcases',
    summary: 'Referensi historis untuk melihat lompatan fitur v0.3 seperti Path Modifiers, Generalized Intersections, dan Geometric Queries.',
    code: v03ShowcaseCode,
  },
  v03_holes: {
    name: 'Historical: Mechanical Faceplate (Holes)',
    category: 'Historical Showcases',
    summary: 'Referensi historis yang mendemonstrasikan fitur lubang (holes) pada path.',
    code: v03HolesCode,
  },
  v04_showcase: {
    name: 'Current Feature Showcase',
    category: 'Showcases',
    summary: 'Ringkasan fitur aktif: Polygon, polymorphic holes, path polyline shorthand, repeat, divide, dan metadata presets.',
    code: v04ShowcaseCode,
  },
};
