// Generates the "TC" app icon set into public/. Run: npm run generate:icons
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");

const WHITE = "#ffffff";
const BLUE = "#1d4ed8";
const SIZE = 512;

// Letters are drawn as shapes (no font dependency). They sit inside the
// maskable safe zone (centre circle, 40% radius) so launchers never crop them.
const GLYPH = `
  <rect x="95" y="166" width="140" height="40" fill="${BLUE}"/>
  <rect x="145" y="166" width="40" height="180" fill="${BLUE}"/>
  <path d="M402.5 206.5 A70 70 0 1 0 402.5 305.5" fill="none" stroke="${BLUE}" stroke-width="40"/>`;

const svg = (background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">${background}${GLYPH}\n</svg>\n`;

// Rounded tile with a blue ring so the white icon stays visible on white surfaces.
const ROUNDED_SVG = svg(`
  <rect x="8" y="8" width="496" height="496" rx="104" fill="${WHITE}" stroke="${BLUE}" stroke-width="16"/>`);
// Full-bleed: the OS applies its own mask (Android maskable, iOS home screen).
const FULL_BLEED_SVG = svg(`
  <rect width="${SIZE}" height="${SIZE}" fill="${WHITE}"/>`);

const png = (source, size) => sharp(Buffer.from(source), { density: 300 }).resize(size, size).png().toBuffer();

// ICO container holding a single PNG image.
function toIco(pngBuffer, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(pngBuffer.length, 14);
  header.writeUInt32LE(header.length, 18); // image data offset
  return Buffer.concat([header, pngBuffer]);
}

await mkdir(ICONS_DIR, { recursive: true });

const outputs = [
  [path.join(ICONS_DIR, "icon.svg"), ROUNDED_SVG],
  [path.join(ICONS_DIR, "icon-192.png"), await png(ROUNDED_SVG, 192)],
  [path.join(ICONS_DIR, "icon-512.png"), await png(ROUNDED_SVG, 512)],
  [path.join(ICONS_DIR, "icon-maskable-512.png"), await png(FULL_BLEED_SVG, 512)],
  [path.join(ICONS_DIR, "apple-touch-icon.png"), await png(FULL_BLEED_SVG, 180)],
  [path.join(PUBLIC_DIR, "favicon.ico"), toIco(await png(ROUNDED_SVG, 48), 48)],
];

for (const [file, data] of outputs) {
  await writeFile(file, data);
  console.log(`wrote ${path.relative(PUBLIC_DIR, file)}`);
}
