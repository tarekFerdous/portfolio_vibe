import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SOURCE = 'C:\\Users\\Bleizby\\Downloads\\owl.jpg';
const SIZE = 512;
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'app', 'icon.png');

const circleMask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="white"/></svg>`
);

await sharp(SOURCE)
  .resize(SIZE, SIZE, { fit: 'cover' })
  .negate({ alpha: false })
  .composite([{ input: circleMask, blend: 'dest-in' }])
  .png()
  .toFile(OUTPUT);

console.log(`Written: ${OUTPUT}`);
