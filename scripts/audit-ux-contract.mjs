import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const componentFiles = [
  'src/App.tsx',
  'src/components/ConfirmDialog.tsx',
  'src/components/Editor.tsx',
  'src/components/GraphViewer.tsx',
  'src/components/Inspector.tsx',
  'src/components/Navbar.tsx',
  'src/components/Preview.tsx',
  'src/components/Sidebar.tsx',
  'src/components/Sidebar/ExampleCard.tsx',
  'src/components/Sidebar/LayersCard.tsx',
  'src/components/Sidebar/MetaPresetsCard.tsx',
  'src/components/Sidebar/ParametersCard.tsx',
  'src/components/Sidebar/ProfilesCard.tsx',
];

const failures = [];

function fail(message) {
  failures.push(message);
}

for (const relativePath of componentFiles) {
  const source = await readFile(resolve(root, relativePath), 'utf8');
  const buttonPattern = /<button\b/g;
  let match;

  while ((match = buttonPattern.exec(source))) {
    const start = match.index;
    const openTag = source.slice(start, start + 600).split('>')[0];
    const line = source.slice(0, start).split('\n').length;
    if (!/\btype\s*=\s*["']button["']/.test(openTag)) {
      fail(`${relativePath}:${line} button is missing type="button"`);
    }
  }

  const formControlPattern = /<(input|select|textarea)\b/g;
  while ((match = formControlPattern.exec(source))) {
    const start = match.index;
    // JSX event handlers may contain `=>`, so do not treat the first `>` as
    // the end of the opening tag. The accessible label is intentionally
    // required close to the declaration and is bounded to avoid scanning an
    // unrelated later control.
    const openTag = source.slice(start, start + 700);
    const line = source.slice(0, start).split('\n').length;
    if (!/\baria-label\s*=|\baria-labelledby\s*=/.test(openTag)) {
      fail(`${relativePath}:${line} ${match[1]} is missing an accessible label`);
    }
  }
}

const appSource = await readFile(resolve(root, 'src/App.tsx'), 'utf8');
if (!appSource.includes('<main ')) fail('App is missing the main landmark');
for (const target of ['#relgeo-editor', '#relgeo-preview']) {
  if (!appSource.includes(`href="${target}"`)) fail(`missing skip link target: ${target}`);
}
for (const target of [
  'Replace the current draft?',
  'Reset the current draft?',
  'Restore the last successful draft?',
]) {
  if (!appSource.includes(target)) fail(`missing dirty-draft confirmation contract: ${target}`);
}
for (const target of ['<ConfirmDialog', 'aria-hidden={confirmationRequest ? true : undefined}']) {
  if (!appSource.includes(target)) fail(`missing application confirmation dialog contract: ${target}`);
}
for (const target of [
  "classList.contains('sidebar-backdrop')",
  "document.querySelector<HTMLElement>('.navbar-secondary-actions summary')",
]) {
  if (!appSource.includes(target)) fail(`missing sidebar focus restoration contract: ${target}`);
}
for (const target of ['id="relgeo-editor"', 'id="relgeo-preview"']) {
  if (!appSource.includes(target)) fail(`missing keyboard navigation anchor: ${target}`);
}
for (const target of ['tabIndex={-1}', 'aria-label="RelGeo source editor"', 'aria-label="RelGeo preview"']) {
  if (!appSource.includes(target)) fail(`missing focusable landmark contract: ${target}`);
}

const previewSource = await readFile(resolve(root, 'src/components/Preview.tsx'), 'utf8');
for (const target of [
  'className="overlay-interactive overlay-anchor"',
  'role="button"',
  'aria-pressed={selectedObjectId === id}',
  'aria-label={previewToolbarAriaLabel}',
  'aria-describedby="preview-toolbar-hint"',
  'aria-labelledby="preview-stage-label"',
  'aria-describedby="preview-stage-hint"',
  'data-preview-mode={toolbarMode}',
  'const fitPreviewToStage = useCallback',
  'new ResizeObserver',
  "window.getComputedStyle(viewport)",
  'activePointersRef',
  'pinchStateRef',
  'getPointerCenter',
  'computePinchPan',
  'computePinchZoom',
]) {
  if (!previewSource.includes(target)) fail(`missing preview accessibility contract: ${target}`);
}

const navbarSource = await readFile(resolve(root, 'src/components/Navbar.tsx'), 'utf8');
for (const target of [
  'preview-global-controls',
  'Global preview controls for ${currentPreviewLabel}',
  'aria-controls="relgeo-preview"',
  'data-preview-mode={isPrintMode ? \'physical\' : \'model\'}',
  'aria-label="Copy source code"',
  'aria-label="Copy share link"',
  'aria-label="Reset source code"',
  'aria-label="Show sidebar on left"',
  'aria-label="Show sidebar on right"',
  'aria-label="Hide sidebar"',
]) {
  if (!navbarSource.includes(target)) fail(`missing global preview control contract: ${target}`);
}

const sidebarSource = await readFile(resolve(root, 'src/components/Sidebar.tsx'), 'utf8');
for (const target of [
  'const backdropRef = useRef<HTMLButtonElement>(null);',
  'focusable.push(backdropRef.current);',
  'onKeyDown={handleDrawerKeyDown}',
]) {
  if (!sidebarSource.includes(target)) fail(`missing mobile drawer focus-trap contract: ${target}`);
}

const confirmDialogSource = await readFile(resolve(root, 'src/components/ConfirmDialog.tsx'), 'utf8');
for (const target of [
  'role="dialog"',
  'aria-modal="true"',
  'aria-labelledby="playground-confirm-title"',
  'aria-describedby="playground-confirm-message"',
  "event.key === 'Escape'",
  'cancelRef.current?.focus()',
  'returnFocusRef.current',
]) {
  if (!confirmDialogSource.includes(target)) fail(`missing confirmation dialog accessibility contract: ${target}`);
}

const inspectorSource = await readFile(resolve(root, 'src/components/Inspector.tsx'), 'utf8');
for (const target of [
  'className="inspector-empty-success" role="status" aria-live="polite"',
  'className="inspector-error-summary"',
  'role="status"',
  'aria-live="polite"',
  'aria-atomic="true"',
  'aria-label="Jump to first error"',
  'getFirstDiagnosticTarget',
  'No source location is available for this diagnostic.',
  'No source target',
]) {
  if (!inspectorSource.includes(target)) fail(`missing diagnostics accessibility contract: ${target}`);
}

const tabRoleCount = (inspectorSource.match(/role="tab"/g) ?? []).length;
if (tabRoleCount !== 5) fail(`Inspector tab count changed unexpectedly: ${tabRoleCount} (expected 5)`);
for (const target of ['aria-selected=', 'aria-controls="inspector-tabpanel"', 'tabIndex=']) {
  if (!inspectorSource.includes(target)) fail(`missing Inspector tab contract: ${target}`);
}

const graphSource = await readFile(resolve(root, 'src/components/GraphViewer.tsx'), 'utf8');
for (const target of [
  "role={onNodeSelect ? 'button' : undefined}",
  'aria-label={onNodeSelect ? `Select object',
  'aria-pressed={onNodeSelect ? isSelected : undefined}',
]) {
  if (!graphSource.includes(target)) fail(`missing graph dynamic button contract: ${target}`);
}

for (const target of [
  'role="separator"',
  'aria-valuemin=',
  'aria-valuemax=',
  'aria-valuenow=',
  'aria-label=',
]) {
  if (!appSource.includes(target) && !navbarSource.includes(target) && !inspectorSource.includes(target)) {
    fail(`missing separator semantics contract: ${target}`);
  }
}

const css = await readFile(resolve(root, 'src/index.css'), 'utf8');
const tokens = await readFile(resolve(root, 'src/styles/tokens.css'), 'utf8');
for (const [label, token] of [
  ['border scale', '--border-thin'],
  ['spacing scale', '--space-1'],
  ['type scale', '--text-body'],
  ['line-height scale', '--leading-copy'],
  ['control elevation', '--elevation-control'],
  ['focus ring', '--focus-ring'],
]) {
  if (!tokens.includes(token)) fail(`missing visual token: ${label}`);
}

const requiredCssContracts = [
  ['responsive breakpoint 840px', '@media (max-width: 840px)'],
  ['handset breakpoint 480px', '@media (max-width: 480px)'],
  ['reduced-motion override', '@media (prefers-reduced-motion: reduce)'],
  ['control target minimum', 'min-width: 2rem'],
  ['preview overscroll containment', 'overscroll-behavior: contain'],
  ['graph keyboard focus ring', '.graph-node:focus-visible .graph-node-rect'],
  ['anchor keyboard focus ring', '.overlay-anchor:focus-visible'],
  ['global preview mode marker', '.preview-global-controls[data-preview-mode=\'physical\']'],
  ['custom preview gesture', '.preview-stage {'],
  ['base CSS layer', '@layer base {'],
  ['foundation CSS layer', '@layer foundation {'],
  ['layout CSS layer', '@layer layout {'],
  ['component CSS layer', '@layer components {'],
  ['responsive CSS layer', '@layer responsive {'],
  ['shell intrinsic-width guard', '.playground-shell {'],
  ['main-area intrinsic-width guard', '.main-area {'],
  ['workspace intrinsic-width guard', '.workspace-split {'],
  ['preview-stage intrinsic-width guard', '.preview-stage {'],
];

for (const [label, contract] of requiredCssContracts) {
  if (!css.includes(contract)) fail(`missing CSS contract: ${label}`);
}

for (const [label, contract] of [
  ['reduced-motion animation clamp', 'animation-duration: 0.001ms !important'],
  ['reduced-motion iteration clamp', 'animation-iteration-count: 1 !important'],
  ['reduced-motion scroll reset', 'scroll-behavior: auto !important'],
  ['reduced-motion transition clamp', 'transition-duration: 0.001ms !important'],
  ['reduced-motion delay reset', 'transition-delay: 0s !important'],
]) {
  if (!css.includes(contract)) fail(`missing reduced-motion declaration: ${label}`);
}

const inlineStyleOccurrences = [];
for (const relativePath of ['src/App.tsx', 'src/components/Preview.tsx', 'src/components/Sidebar.tsx']) {
  const source = await readFile(resolve(root, relativePath), 'utf8');
  const pattern = /style=\{/g;
  let match;
  while ((match = pattern.exec(source))) {
    inlineStyleOccurrences.push(`${relativePath}:${source.slice(0, match.index).split('\n').length}`);
  }
}

if (inlineStyleOccurrences.length !== 4) {
  fail(`unexpected dynamic inline style count: ${inlineStyleOccurrences.length} (expected 4)`);
}

const rawRadiusPattern = /border-radius:\s*(?:\d+(?:\.\d+)?px|\d+%)/g;
const rawRadiusMatches = css.match(rawRadiusPattern) ?? [];
if (rawRadiusMatches.length > 0) {
  fail(`raw border-radius values remain outside visual tokens: ${rawRadiusMatches.join(', ')}`);
}

if (!/\.preview-stage\s*\{[\s\S]*?touch-action:\s*none;/.test(css)) {
  fail('preview stage is missing touch-action: none for custom pan gestures');
}

for (const [label, selector] of [
  ['shell', /\.playground-shell\s*\{[\s\S]*?min-width:\s*0;/],
  ['main area', /\.main-area\s*\{[\s\S]*?min-width:\s*0;/],
  ['workspace split', /\.workspace-split\s*\{[\s\S]*?min-width:\s*0;/],
  ['preview stage', /\.preview-stage\s*\{[\s\S]*?min-width:\s*0;/],
]) {
  if (!selector.test(css)) fail(`missing intrinsic-width guard: ${label}`);
}

const handsetInspectorCss = /@media \(max-width: 480px\)\s*\{[\s\S]*?\.inspector-tab-strip\s*\{[\s\S]*?overflow-x:\s*auto;[\s\S]*?\.inspector-object-select\s*\{[\s\S]*?flex-wrap:\s*wrap;/;
if (!handsetInspectorCss.test(css)) fail('missing handset Inspector wrapping/scroll contract');

if (failures.length > 0) {
  console.error('UX contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`UX contract audit passed: ${componentFiles.length} component files, ${inlineStyleOccurrences.length} approved dynamic inline styles.`);
}
