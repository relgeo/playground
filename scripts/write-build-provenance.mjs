#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';

const playgroundRoot = resolve(import.meta.dirname, '..');
const dist = join(playgroundRoot, 'dist');
const entrypoint = join(dist, 'index.html');

function sourceRevision() {
  if (process.env.RELGEO_PLAYGROUND_REVISION) return process.env.RELGEO_PLAYGROUND_REVISION;

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: playgroundRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unavailable';
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function assetReferences(html) {
  return [...html.matchAll(/(?:src|href)="\/playground\/(assets\/[^"?#]+)"/g)]
    .map(([, asset]) => asset)
    .sort();
}

const html = await readFile(entrypoint, 'utf8');
const assets = assetReferences(html);
if (assets.length === 0) throw new Error('Playground build has no local asset references');
const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
if (!title) throw new Error('Playground build has no document title');

const assetDigests = {};
for (const asset of assets) {
  const assetPath = join(dist, asset);
  const fileStats = await stat(assetPath);
  if (!fileStats.isFile()) throw new Error(`Playground asset is not a file: ${asset}`);
  const digest = createHash('sha256').update(await readFile(assetPath)).digest('hex');
  assetDigests[asset] = digest;
}

const allFiles = (await listFiles(dist))
  .filter((filePath) => relative(dist, filePath) !== 'playground-provenance.json')
  .sort();
const fileDigests = {};
for (const filePath of allFiles) {
  const file = relative(dist, filePath).split('/').join('/');
  fileDigests[file] = createHash('sha256').update(await readFile(filePath)).digest('hex');
}

const output = {
  schemaVersion: 1,
  artifact: 'relgeo-playground',
  sourcePath: 'playground',
  sourceRevision: sourceRevision(),
  entrypoint: 'index.html',
  basePath: '/playground/',
  title,
  assetManifest: assets,
  assetDigests,
  fileDigests,
  fileCount: allFiles.length,
};

await writeFile(join(dist, 'playground-provenance.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Playground build provenance written for ${output.sourceRevision} (${assets.length} entry assets).`);
