/**
 * Generate PWA icon PNG files for the clinic app.
 * Uses only Node.js built-in zlib (no external deps).
 * Creates solid purple (#5D3E8E) square icons.
 *
 * Run: node scripts/generate-icons.js
 * Output: src/assets/icons/icon-{size}x{size}.png
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SIZES = [192, 512];
const COLOR = [93, 62, 142, 255]; // #5D3E8E
const OUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'icons');

function createPng(size) {
  // Minimal PNG generator: IHDR + IDAT (raw deflated pixel data) + IEND
  const width = size;
  const height = size;

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);   // width
  ihdrData.writeUInt32BE(height, 4);  // height
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 2;   // color type: RGB
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace

  // Build raw pixel data (filter byte + RGB for each row)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 3);
    raw[offset] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 3;
      raw[px] = COLOR[0];     // R
      raw[px + 1] = COLOR[1]; // G
      raw[px + 2] = COLOR[2]; // B
    }
  }

  const deflated = zlib.deflateSync(raw);

  // Assemble PNG
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);

  return png;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc);
  return Buffer.concat([len, typeB, data, crcB]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── Main ──
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

for (const size of SIZES) {
  const filePath = path.join(OUT_DIR, `icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, createPng(size));
  const stats = fs.statSync(filePath);
  console.log(`Created ${filePath} (${stats.size} bytes)`);
}

console.log('Done.');
