/**
 * app/uploads · assets/seed 이미지 → manifest + seedAssets.generated.ts
 * HEIC는 JPEG로 변환 후 등록 (웹/앱 호환)
 * 사용: npm run import-uploads
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import convert from 'heic-convert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '..');
const projectRoot = path.join(appRoot, '..');
const uploadsDir = path.join(appRoot, 'uploads');
const seedDir = path.join(appRoot, 'assets', 'seed');
const manifestPath = path.join(seedDir, 'manifest.json');

const RASTER_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const HEIC_EXT = new Set(['.heic', '.heif']);

function isRaster(name) {
  return RASTER_EXT.has(path.extname(name).toLowerCase());
}

function isHeic(name) {
  return HEIC_EXT.has(path.extname(name).toLowerCase());
}

function listRasterImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && isRaster(e.name))
    .map((e) => path.join(dir, e.name));
}

function listHeicInSeed() {
  if (!fs.existsSync(seedDir)) return [];
  return fs
    .readdirSync(seedDir, { withFileTypes: true })
    .filter((e) => e.isFile() && isHeic(e.name))
    .map((e) => path.join(seedDir, e.name));
}

function nicknameFromFilename(file) {
  const base = path.basename(file, path.extname(file));
  const known = {
    'nike-pegasus-40': '나이키 페가수스 40',
    pegasus40: '나이키 페가수스 40',
    pegasus: '나이키 페가수스 40',
    img6551: '러닝화 (IMG 6551)',
  };
  const key = base.toLowerCase().replace(/\s+/g, '-');
  if (known[key]) return known[key];
  if (/^img[\s_-]?\d+$/i.test(base)) {
    return `러닝화 (${base.toUpperCase()})`;
  }
  return base.replace(/[-_]+/g, ' ').trim() || '러닝화';
}

async function heicToJpeg(heicPath) {
  const base = path.basename(heicPath, path.extname(heicPath));
  const outPath = path.join(seedDir, `${base}.jpg`);
  const input = fs.readFileSync(heicPath);
  const output = await convert({
    buffer: input,
    format: 'JPEG',
    quality: 0.88,
  });
  fs.writeFileSync(outPath, Buffer.from(output));
  return outPath;
}

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(seedDir, { recursive: true });

const copied = [];

for (const heic of listHeicInSeed()) {
  const jpg = await heicToJpeg(heic);
  copied.push({
    file: path.basename(jpg),
    nickname: nicknameFromFilename(heic),
    from: path.basename(heic),
  });
}

for (const src of [...listRasterImages(uploadsDir), ...listRasterImages(projectRoot)]) {
  const name = path.basename(src);
  if (name === 'icon.png' || name === 'splash-icon.png' || name === 'favicon.png') continue;
  const dest = path.join(seedDir, name);
  if (path.resolve(src) !== path.resolve(dest)) {
    fs.copyFileSync(src, dest);
    copied.push({ file: name, nickname: nicknameFromFilename(src) });
  }
}

let manifest = { items: [] };
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}
const byFile = new Map(manifest.items.map((i) => [i.file, i]));

for (const f of listRasterImages(seedDir)) {
  const file = path.basename(f);
  if (!byFile.has(file)) {
    byFile.set(file, {
      file,
      nickname: nicknameFromFilename(f),
      source: 'album',
    });
  }
}

for (const item of byFile.values()) {
  if (item.nickname?.includes('IMG 6551') || item.file?.startsWith('IMG_6551')) {
    item.nickname = '러닝화 (IMG 6551)';
  }
}

manifest.items = [...byFile.values()];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

const genPath = path.join(appRoot, 'src', 'seedAssets.generated.ts');
const lines = manifest.items.map(
  (item) => `  '${item.file}': require('../assets/seed/${item.file}'),`,
);
const genSrc = `/** 자동 생성 — npm run import-uploads */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const SEED_ASSETS = {
${lines.join('\n')}
} as const;
`;
fs.writeFileSync(genPath, genSrc, 'utf8');

console.log('Import done.');
console.log('seed dir:', seedDir);
console.log('manifest items:', manifest.items.length);
for (const c of copied) {
  console.log(' -', c.from ? `${c.from} → ${c.file}` : c.file, '→', c.nickname);
}
for (const item of manifest.items) {
  console.log(' [seed]', item.file, '→', item.nickname);
}
