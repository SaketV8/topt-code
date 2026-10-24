// Renders src/images/icon.svg to the PNG sizes the extension uses.
// Run with: pnpm run icons
import sharp from 'sharp'
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const imagesDir = resolve(projectDir, 'src/images')
const svg = readFileSync(resolve(imagesDir, 'icon.svg'))

// icon.png is the larger logo used in the popup header; the rest are the
// toolbar/manifest sizes.
const outputs = {
  16: 'icon-16.png',
  32: 'icon-32.png',
  48: 'icon-48.png',
  64: 'icon-64.png',
  128: 'icon-128.png',
  256: 'icon.png'
}

for (const [size, name] of Object.entries(outputs)) {
  const n = Number(size)
  await sharp(svg, {density: Math.max(96, n * 4)})
    .resize(n, n, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}})
    .png()
    .toFile(resolve(imagesDir, name))
  console.log('wrote', name, `${n}x${n}`)
}
