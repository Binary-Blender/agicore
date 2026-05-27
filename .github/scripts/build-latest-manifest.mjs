#!/usr/bin/env node
// Build the latest.json manifest that Tauri's updater plugin reads.
//
// Usage: node build-latest-manifest.mjs <version-tag> <assets-dir>
//
// Reads .sig files from <assets-dir> and pairs them with their
// matching installer assets, producing a manifest of the shape Tauri
// expects:
//
//   {
//     "version": "0.1.0-beta.1",
//     "notes": "Released via tag studio-v0.1.0-beta.1",
//     "pub_date": "2026-05-27T12:34:56Z",
//     "platforms": {
//       "windows-x86_64": { "signature": "...", "url": "https://.../Agicore Studio_0.1.0-beta.1_x64-setup.nsis.zip" },
//       "darwin-aarch64": { "signature": "...", "url": "https://.../Agicore Studio_0.1.0-beta.1_aarch64.app.tar.gz" },
//       "linux-x86_64":   { "signature": "...", "url": "https://.../agicore-studio_0.1.0-beta.1_amd64.AppImage" }
//     }
//   }
//
// The platform-key inference is intentionally narrow — only the file
// shapes Tauri's bundler actually emits. Unknown files are skipped
// with a warning rather than crashing, so future bundler changes
// degrade gracefully.

import fs from 'node:fs';
import path from 'node:path';

const [, , tagArg, dirArg] = process.argv;
if (!tagArg || !dirArg) {
  console.error('usage: build-latest-manifest.mjs <version-tag> <assets-dir>');
  process.exit(2);
}

const version = tagArg.replace(/^studio-v/, '');
const dir = path.resolve(dirArg);
const repoUrl = 'https://github.com/Binary-Blender/agicore';
const downloadBase = `${repoUrl}/releases/download/${tagArg}`;

const files = fs.readdirSync(dir);
const sigs = files.filter((f) => f.endsWith('.sig'));

const platforms = {};
for (const sig of sigs) {
  const assetName = sig.slice(0, -'.sig'.length);
  if (!files.includes(assetName)) {
    console.warn(`skip: ${sig} has no matching asset`);
    continue;
  }
  const platformKey = inferPlatformKey(assetName);
  if (!platformKey) {
    console.warn(`skip: ${assetName} — no platform key match`);
    continue;
  }
  const signature = fs.readFileSync(path.join(dir, sig), 'utf8').trim();
  // GitHub URL-encodes spaces in release asset filenames.
  const url = `${downloadBase}/${encodeURIComponent(assetName)}`;
  platforms[platformKey] = { signature, url };
  console.log(`mapped: ${platformKey} → ${assetName}`);
}

if (Object.keys(platforms).length === 0) {
  console.error('No platforms mapped — refusing to write empty manifest.');
  process.exit(1);
}

const manifest = {
  version,
  notes: `Released via tag ${tagArg}.`,
  pub_date: new Date().toISOString(),
  platforms,
};

const outPath = path.join(dir, 'latest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`wrote ${outPath}`);

function inferPlatformKey(filename) {
  // Tauri's updater identifies platforms by these specific keys. The
  // bundler's filename shapes are stable across recent Tauri versions
  // but check Tauri release notes when bumping if signing breaks.
  if (filename.endsWith('.nsis.zip'))            return 'windows-x86_64';
  if (filename.endsWith('.msi.zip'))             return 'windows-x86_64';
  if (filename.endsWith('.app.tar.gz')) {
    if (filename.includes('aarch64'))            return 'darwin-aarch64';
    return 'darwin-x86_64';
  }
  if (filename.endsWith('.AppImage'))            return 'linux-x86_64';
  return null;
}
