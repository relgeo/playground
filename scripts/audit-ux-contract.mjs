import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const componentFiles = [
  'src/App.tsx',
  'src/components/Editor.tsx',
  'src/components/GraphViewer.tsx',
  'src/components/Inspector.tsx',
  'src/components/Navbar.tsx',
  'src/components/Preview.tsx',
  'src/components/Sidebar.tsx',
  'src/components/Sidebar/ExampleCard.tsx',
  'src/components/Sidebar/LayersCard.tsx',
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
}

const appSource = await readFile(resolve(root, 'src/App.tsx'), 'utf8');
if (!appSource.includes('<main ')) fail('App is missing the main landmark');
for (const target of ['#relgeo-editor', '#relgeo-preview']) {
  if (!appSource.includes(`href="${target}"`)) fail(`missing skip link target: ${target}`);
}
for (const target of ['id="relgeo-editor"', 'id="relgeo-preview"']) {
  if (!appSource.includes(target)) fail(`missing keyboard navigation anchor: ${target}`);
}

const css = await readFile(resolve(root, 'src/index.css'), 'utf8');
const requiredCssContracts = [
  ['responsive breakpoint 840px', '@media (max-width: 840px)'],
  ['handset breakpoint 480px', '@media (max-width: 480px)'],
  ['reduced-motion override', '@media (prefers-reduced-motion: reduce)'],
  ['control target minimum', 'min-width: 2rem'],
  ['preview overscroll containment', 'overscroll-behavior: contain'],
  ['graph keyboard focus ring', '.graph-node:focus-visible .graph-node-rect'],
];

for (const [label, contract] of requiredCssContracts) {
  if (!css.includes(contract)) fail(`missing CSS contract: ${label}`);
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

if (failures.length > 0) {
  console.error('UX contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`UX contract audit passed: ${componentFiles.length} component files, ${inlineStyleOccurrences.length} approved dynamic inline styles.`);
}
