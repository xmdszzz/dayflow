// Generate app icons programmatically
// Run: node scripts/generate-icons.js
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const RESOURCES = path.join(__dirname, '..', 'resources')
if (!fs.existsSync(RESOURCES)) fs.mkdirSync(RESOURCES, { recursive: true })

function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const ihdrChunk = createChunk('IHDR', ihdr)

  // IDAT chunk - raw pixel data with filter byte per row
  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const offset = y * (1 + width * 4) + 1 + x * 4
      rawData[offset] = pixels[idx * 4]       // R
      rawData[offset + 1] = pixels[idx * 4 + 1] // G
      rawData[offset + 2] = pixels[idx * 4 + 2] // B
      rawData[offset + 3] = pixels[idx * 4 + 3] // A
    }
  }
  const compressed = zlib.deflateSync(rawData)
  const idatChunk = createChunk('IDAT', compressed)

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc, 0)
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

// CRC32 lookup table
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[i] = c
}

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ===== Tray Icon: 32x32 rounded square with checkmark =====
function createTrayIcon() {
  const size = 32
  const pixels = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2, r = 13

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= r + 1) {
        // Purple rounded square
        pixels[idx] = 0xCB  // R
        pixels[idx + 1] = 0xA6 // G
        pixels[idx + 2] = 0xF7 // B
        pixels[idx + 3] = 255  // A
        // Darker edge
        if (dist > r - 1) {
          pixels[idx + 3] = 200
        }
      } else {
        pixels[idx + 3] = 0 // transparent
      }

      // White checkmark
      const checkX = x - 9, checkY = y - 9
      if (checkY > 0 && checkY < 14) {
        const line1 = Math.abs(checkX - checkY * 0.4 - 1)
        const line2 = Math.abs(checkX + checkY * 0.6 - 13)
        if (line1 < 2 || line2 < 2) {
          pixels[idx] = 255
          pixels[idx + 1] = 255
          pixels[idx + 2] = 255
          pixels[idx + 3] = Math.max(pixels[idx + 3], 250)
        }
      }
    }
  }
  return createPNG(size, size, pixels)
}

// ===== App Icon: 256x256 =====
function createAppIcon() {
  const size = 256
  const pixels = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2, r = 110

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= r) {
        // Gradient from darker to lighter purple
        const t = dist / r
        pixels[idx] = Math.round(0x89 + (0xCB - 0x89) * (1 - t))
        pixels[idx + 1] = Math.round(0x89 + (0xA6 - 0x89) * (1 - t))
        pixels[idx + 2] = Math.round(0xFA + (0xF7 - 0xFA) * (1 - t))
        pixels[idx + 3] = 255
      } else {
        pixels[idx + 3] = 0
      }
    }
  }

  // "C2L" text - simplified as horizontal bars for each letter
  // Just draw a bold "C" shape
  const letterSize = 90
  const lx = cx - letterSize / 2, ly = cy - letterSize / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      if (pixels[idx + 3] < 10) continue

      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Checkmark instead of text — cleaner at this size
      const checkCenterX = cx - 10, checkCenterY = cy + 0
      const ckx = x - checkCenterX, cky = y - checkCenterY

      // Draw a bold checkmark
      const scaled = 1.2
      const arm1 = Math.abs(ckx * scaled + cky * 0.4 * scaled)
      const arm2 = Math.abs(ckx * scaled - cky * 0.75 * scaled - 60)

      if ((arm1 < 14 && cky > -50 && cky < 30 && ckx < 30) ||
          (arm2 < 14 && cky > -10 && cky < 60 && ckx > -70)) {
        pixels[idx] = 0x1E
        pixels[idx + 1] = 0x1E
        pixels[idx + 2] = 0x2E
        pixels[idx + 3] = 255
      }
    }
  }

  return createPNG(size, size, pixels)
}

// Generate and save
const trayPng = createTrayIcon()
fs.writeFileSync(path.join(RESOURCES, 'tray-icon.png'), trayPng)
console.log('Created tray-icon.png')

const appPng = createAppIcon()
fs.writeFileSync(path.join(RESOURCES, 'app-icon.png'), appPng)
console.log('Created app-icon.png')

// Create a minimal .ico file (just wraps the PNG for Windows)
// Simple ICO format: ICO header + 1 entry pointing to embedded PNG
function createICO(pngData) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)  // reserved
  header.writeUInt16LE(1, 2)  // ICO type
  header.writeUInt16LE(1, 4)  // 1 image

  // For ICO, we use the PNG directly (Vista+ supports PNG-in-ICO)
  const entry = Buffer.alloc(16)
  entry.writeUInt8(0, 0)   // width (0 = 256px in ICO)
  entry.writeUInt8(0, 1)   // height (0 = 256px)
  entry.writeUInt8(0, 2)     // no palette
  entry.writeUInt8(0, 3)     // reserved
  entry.writeUInt16LE(1, 4)  // planes
  entry.writeUInt16LE(32, 6) // bpp
  entry.writeUInt32LE(pngData.length, 8)  // size
  entry.writeUInt32LE(22, 12) // offset (header + 1 entry)

  return Buffer.concat([header, entry, pngData])
}

const ico = createICO(appPng)
fs.writeFileSync(path.join(RESOURCES, 'icon.ico'), ico)
console.log('Created icon.ico')
console.log('All icons generated in resources/')
