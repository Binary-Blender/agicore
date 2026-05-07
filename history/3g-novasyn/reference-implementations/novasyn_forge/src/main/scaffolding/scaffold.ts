import fs from 'fs';
import path from 'path';
import { getDatabase } from '../database/db';
import type { ForgeProject } from '../../shared/types';
import { generateScaffoldFiles, ScaffoldConfig } from './templates';

export interface ScaffoldResult {
  success: boolean;
  filesCreated: number;
  error?: string;
}

export async function scaffoldProject(project: ForgeProject): Promise<ScaffoldResult> {
  const config: ScaffoldConfig = {
    projectName: project.name,
    packageName: project.packageName,
    displayName: project.displayName,
    port: project.port,
    dbName: project.dbName,
    appId: project.appId,
  };

  const files = generateScaffoldFiles(config);

  try {
    // Check if directory exists, create if not
    fs.mkdirSync(project.path, { recursive: true });

    // Check if directory has existing files (warn)
    const existing = fs.readdirSync(project.path);
    const hasExistingCode = existing.some(f => f === 'package.json' || f === 'src');

    let filesCreated = 0;
    for (const file of files) {
      const fullPath = path.join(project.path, file.relativePath);
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf-8');
      filesCreated++;
    }

    // Update project status in DB
    const db = getDatabase();
    db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('scaffolded', project.id);

    return { success: true, filesCreated };
  } catch (error) {
    return {
      success: false,
      filesCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
