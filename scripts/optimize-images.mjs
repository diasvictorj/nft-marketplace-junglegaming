/**
 * Gera as variantes WebP versionadas em public/assets/nfts a partir das ilustrações
 * exportadas do Figma (design/figma-assets). Executar: npm run assets.
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const src = 'design/figma-assets'
const out = 'public/assets/nfts'
const sizes = { thumb: 320, md: 640, lg: 960 }

await mkdir(out, { recursive: true })
for (const file of await readdir(src)) {
  if (!file.endsWith('.png')) continue
  const name = path.basename(file, '.png')
  for (const [suffix, width] of Object.entries(sizes)) {
    await sharp(path.join(src, file))
      .resize(width)
      .webp({ quality: 78 })
      .toFile(path.join(out, `${name}-${suffix}.webp`))
  }
}
console.log('assets otimizados em', out)
