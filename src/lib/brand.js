import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Favicons, touch icon, JSON-LD logo and the default social share image, all derived from the supplied logo files. */
export async function brandAssets({ root, dist }) {
  const mark = path.join(root, 'images-src/logo-mark.png');
  const full = path.join(root, 'images-src/logo-full.jpg');
  const white = { r: 255, g: 255, b: 255, alpha: 1 };

  const png = (size) => sharp(mark).resize(size, size, { fit: 'contain', background: white }).flatten({ background: white }).png().toBuffer();

  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'logo.png'), await png(512));
  fs.writeFileSync(path.join(dist, 'icon-192.png'), await png(192));
  fs.writeFileSync(path.join(dist, 'apple-touch-icon.png'), await png(180));

  // favicon.ico: one 32x32 PNG inside an ICO container
  const p32 = await png(32);
  const header = Buffer.from([0, 0, 1, 0, 1, 0]);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);
  entry.writeUInt8(32, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(p32.length, 8);
  entry.writeUInt32LE(22, 12);
  fs.writeFileSync(path.join(dist, 'favicon.ico'), Buffer.concat([header, entry, p32]));

  // 1200x630 share image: the full logo on white, nothing cropped
  await sharp(full)
    .resize(1200, 630, { fit: 'contain', background: white })
    .flatten({ background: white })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(dist, 'og-default.jpg'));

  return { path: '/og-default.jpg', width: 1200, height: 630, alt: 'لوگوی رستا پک، طراحی کارتن و بسته‌بندی' };
}
