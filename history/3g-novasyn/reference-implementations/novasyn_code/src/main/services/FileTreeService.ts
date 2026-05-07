import fs from 'fs';
import path from 'path';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.cache',
  '__pycache__', '.venv', 'venv', '.idea', '.vscode', 'coverage',
  '.turbo', '.nuxt', '.output',
]);

const IGNORED_FILES = new Set([
  '.DS_Store', 'Thumbs.db', 'desktop.ini',
]);

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function buildFileTree(rootPath: string, maxDepth: number = 10): FileNode {
  return scanDirectory(rootPath, 0, maxDepth);
}

function scanDirectory(dirPath: string, depth: number, maxDepth: number): FileNode {
  const name = path.basename(dirPath);
  const node: FileNode = { name, path: dirPath, type: 'directory', children: [] };

  if (depth >= maxDepth) return node;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return node;
  }

  // Sort: directories first, then files, both alphabetical
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name) && entry.isDirectory()) continue;
    if (IGNORED_FILES.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.isDirectory()) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      node.children!.push(scanDirectory(fullPath, depth + 1, maxDepth));
    } else {
      node.children!.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }

  return node;
}

export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function writeFileContent(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function createNewFile(filePath: string, content: string = ''): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function deleteFileOrDir(filePath: string): void {
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    fs.rmSync(filePath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(filePath);
  }
}

export function renameFileOrDir(oldPath: string, newPath: string): void {
  fs.renameSync(oldPath, newPath);
}
