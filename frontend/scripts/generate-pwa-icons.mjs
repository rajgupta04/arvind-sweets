import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const iconsDir = path.join(publicDir, 'icons');

const baseIconPath = path.join(iconsDir, 'icon-512.png');

const iconSizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateSquareIcon({ inputPath, outputPath, size }) {
  if (path.resolve(inputPath) === path.resolve(outputPath)) {
    return;
  }
  await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function generateMaskableIcon({ inputPath, outputPath, size }) {
  // Maskable icons need safe padding. We create a transparent canvas
  // and place a scaled version of the base icon in the center.
  const safeScale = 0.8;
  const innerSize = Math.round(size * safeScale);
  const pad = Math.floor((size - innerSize) / 2);

  const inner = await sharp(inputPath)
    .resize(innerSize, innerSize, { fit: 'cover' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: inner, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function main() {
  if (!(await fileExists(baseIconPath))) {
    throw new Error(`Missing base icon: ${baseIconPath}`);
  }

  await fs.mkdir(iconsDir, { recursive: true });

  for (const size of iconSizes) {
    const out = path.join(iconsDir, `icon-${size}.png`);
    await generateSquareIcon({ inputPath: baseIconPath, outputPath: out, size });
  }

  await generateMaskableIcon({
    inputPath: baseIconPath,
    outputPath: path.join(iconsDir, 'maskable-icon-192.png'),
    size: 192
  });

  await generateMaskableIcon({
    inputPath: baseIconPath,
    outputPath: path.join(iconsDir, 'maskable-icon-512.png'),
    size: 512
  });

  console.log('[generate:pwa-icons] Done. Generated icons in:', iconsDir);
}

await main();
