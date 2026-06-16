/**
 * Gera ícones PNG 192 e 512 (Chrome exige PNG para PWA instalável).
 * Rode: node scripts/generate-pwa-icons.mjs
 */
import { createHash } from "crypto";
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "public");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/** PNG sólido #0F3D4C com letra S branca simplificada (bloco central). */
function pngSolid(size) {
  const row = Buffer.alloc(1 + size * 4);
  const raw = Buffer.alloc((1 + size * 4) * size);
  const bg = [0x0f, 0x3d, 0x4c, 0xff];
  const fg = [0xff, 0xff, 0xff, 0xff];
  const margin = Math.floor(size * 0.22);
  const inner = size - margin * 2;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const inBar =
        x >= margin &&
        x < margin + inner &&
        y >= margin &&
        y < margin + inner &&
        (x < margin + inner * 0.35 ||
          (y < margin + inner * 0.45 && x > margin + inner * 0.55) ||
          (y > margin + inner * 0.55 && y < margin + inner * 0.75));
      const px = inBar ? fg : bg;
      const o = rowStart + 1 + x * 4;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
      raw[o + 3] = px[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(root, { recursive: true });
for (const size of [192, 512]) {
  const buf = pngSolid(size);
  const path = join(root, `pwa-${size}x${size}.png`);
  writeFileSync(path, buf);
  console.log(`Wrote ${path} (${buf.length} bytes, md5=${createHash("md5").update(buf).digest("hex")})`);
}
