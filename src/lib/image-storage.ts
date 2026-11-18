import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { resolveUploadRoot } from './runtime-config.ts';

const PRIVATE_ROOT = resolveUploadRoot(process.env);

export type PrivateFileBucket = 'face' | 'full' | 'docs' | 'logos';

const BUCKET_DIRS: Record<PrivateFileBucket, string> = {
  face: path.join(PRIVATE_ROOT, 'photos', 'face'),
  full: path.join(PRIVATE_ROOT, 'photos', 'full'),
  docs: path.join(PRIVATE_ROOT, 'docs'),
  logos: path.join(PRIVATE_ROOT, 'logos'),
};

export function ensurePrivateStorageDirs(): void {
  for (const dir of Object.values(BUCKET_DIRS)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function resolvePrivateFilePath(bucket: PrivateFileBucket, filename: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(BUCKET_DIRS, bucket)) {
    return null;
  }
  const safeName = path.basename(filename);
  if (safeName !== filename || safeName.includes('..')) {
    return null;
  }
  return path.join(BUCKET_DIRS[bucket], safeName);
}

export async function saveOptimizedPhoto(
  buffer: Buffer,
  bucket: 'face' | 'full' | 'logos',
  prefix: string
): Promise<string> {
  ensurePrivateStorageDirs();
  const dimensions =
    bucket === 'logos'
      ? { width: 420, height: 420 }
      : bucket === 'face'
        ? { width: 600, height: 800 }
        : { width: 800, height: 1200 };

  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.webp`;
  const destPath = path.join(BUCKET_DIRS[bucket], filename);

  await sharp(buffer)
    .rotate()
    .resize(dimensions.width, dimensions.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(destPath);

  return `/api/files/${bucket}/${filename}`;
}

export function savePrivateDocumentFile(buffer: Buffer, originalName: string): {
  filePath: string;
  safeOriginalName: string;
} {
  ensurePrivateStorageDirs();
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const finalExt = allowedExts.includes(ext) ? ext : '.bin';
  const storedName = `doc_${Date.now()}_${crypto.randomBytes(5).toString('hex')}${finalExt}`;
  const destPath = path.join(BUCKET_DIRS.docs, storedName);
  fs.writeFileSync(destPath, buffer);
  return {
    filePath: `/api/files/docs/${storedName}`,
    safeOriginalName: path.basename(originalName),
  };
}

export async function ensureSeedAssetsInPrivateStorage(): Promise<void> {
  ensurePrivateStorageDirs();
  const seedAssets: Array<{
    sourceRel: string;
    bucket: 'face' | 'full' | 'logos';
    targetName: string;
    width: number;
    height: number;
  }> = [
    {
      sourceRel: 'src/assets/images/worker_face_amina_1794948393588.jpg',
      bucket: 'face',
      targetName: 'seed_amina_face.webp',
      width: 600,
      height: 800,
    },
    {
      sourceRel: 'src/assets/images/worker_full_amina_1794948393941.jpg',
      bucket: 'full',
      targetName: 'seed_amina_full.webp',
      width: 800,
      height: 1200,
    },
    {
      sourceRel: 'src/assets/images/worker_face_karim_1794948394645.jpg',
      bucket: 'face',
      targetName: 'seed_karim_face.webp',
      width: 600,
      height: 800,
    },
    {
      sourceRel: 'src/assets/images/worker_full_karim_1794948395110.jpg',
      bucket: 'full',
      targetName: 'seed_karim_full.webp',
      width: 800,
      height: 1200,
    },
    {
      sourceRel: 'src/assets/images/company_logo_aljazira_1794948395142.jpg',
      bucket: 'logos',
      targetName: 'seed_aljazira_logo.webp',
      width: 420,
      height: 420,
    },
  ];

  for (const item of seedAssets) {
    const dest = path.join(BUCKET_DIRS[item.bucket], item.targetName);
    if (fs.existsSync(dest)) continue;
    const src = path.resolve(process.cwd(), item.sourceRel);
    if (!fs.existsSync(src)) continue;
    await sharp(src)
      .resize(item.width, item.height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(dest);
  }
}
