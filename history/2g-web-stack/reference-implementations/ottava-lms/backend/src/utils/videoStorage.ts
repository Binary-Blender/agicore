import fs from 'fs/promises';
import path from 'path';
import { resolveVisualLibraryDir, buildVisualPublicUrl } from './visualLibrary';

export interface SavedVideoInfo {
  storagePath: string;
  publicUrl: string;
  fileSize: number;
}

const defaultExtension = '.mp4';

export const persistVideoFile = async (
  trainingModuleId: string | null,
  buffer: Buffer,
  fileExtension?: string
): Promise<SavedVideoInfo> => {
  const moduleFolder = trainingModuleId || 'shared';
  const sanitizedFolder = moduleFolder || 'shared';
  const visualRoot = resolveVisualLibraryDir();
  const moduleDir = path.join(visualRoot, sanitizedFolder);
  await fs.mkdir(moduleDir, { recursive: true });

  const extension =
    fileExtension && fileExtension.startsWith('.') ? fileExtension : defaultExtension;
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`;
  const storagePath = path.join(moduleDir, filename);
  await fs.writeFile(storagePath, buffer);

  return {
    storagePath,
    publicUrl: buildVisualPublicUrl(sanitizedFolder, filename),
    fileSize: buffer.length,
  };
};
