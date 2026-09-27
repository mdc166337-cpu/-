import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * bytesPerPixel;
      // Rounded corner check
      const radius = Math.floor(width * 0.2);
      let inCorner = false;
      const corners = [
        [radius, radius],
        [width - radius, radius],
        [radius, height - radius],
        [width - radius, height - radius]
      ];
      for (const [cx, cy] of corners) {
        if ((x < cx && y < cy) || (x > cx && y < cy) || (x < cx && y > cy) || (x > cx && y > cy)) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy > radius * radius) {
            inCorner = true;
          }
        }
      }

      if (inCorner) {
        rawData[pixelStart] = 0;
        rawData[pixelStart + 1] = 0;
        rawData[pixelStart + 2] = 0;
        rawData[pixelStart + 3] = 0;
      } else {
        rawData[pixelStart] = r;
        rawData[pixelStart + 1] = g;
        rawData[pixelStart + 2] = b;
        rawData[pixelStart + 3] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const typeAndData = buf.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync('public/icon-192.png', createPNG(192, 192, 5, 150, 105));
fs.writeFileSync('public/icon-512.png', createPNG(512, 512, 5, 150, 105));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, 5, 150, 105));
console.log('PWA PNG icons generated successfully!');
