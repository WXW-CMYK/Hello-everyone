import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = resolve(root, 'build')
const iconsetDir = resolve(buildDir, 'icon.iconset')
const svgPath = resolve(buildDir, 'icon.svg')
const pngPath = resolve(buildDir, 'icon.png')
const icnsPath = resolve(buildDir, 'icon.icns')
const icoPath = resolve(buildDir, 'icon.ico')

const iconsetSpecs = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
]

const icoSpecs = [
  ['icon_16x16.png', 16],
  ['icon_32x32.png', 32],
  ['icon_48x48.png', 48],
  ['icon_256x256.png', 256]
]

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

function pngSize(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Expected a PNG image')
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  }
}

function createIco(entries, outputPath) {
  const headerSize = 6
  const directorySize = entries.length * 16
  let imageOffset = headerSize + directorySize
  const buffers = []

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  buffers.push(header)

  const directory = Buffer.alloc(directorySize)
  entries.forEach((entry, index) => {
    const offset = index * 16
    const size = entry.size === 256 ? 0 : entry.size
    directory.writeUInt8(size, offset)
    directory.writeUInt8(size, offset + 1)
    directory.writeUInt8(0, offset + 2)
    directory.writeUInt8(0, offset + 3)
    directory.writeUInt16LE(1, offset + 4)
    directory.writeUInt16LE(32, offset + 6)
    directory.writeUInt32LE(entry.buffer.length, offset + 8)
    directory.writeUInt32LE(imageOffset, offset + 12)
    imageOffset += entry.buffer.length
  })
  buffers.push(directory)
  buffers.push(...entries.map((entry) => entry.buffer))

  writeFileSync(outputPath, Buffer.concat(buffers))
}

if (!existsSync(svgPath)) {
  throw new Error(`Missing ${svgPath}`)
}

mkdirSync(buildDir, { recursive: true })
rmSync(iconsetDir, { recursive: true, force: true })
mkdirSync(iconsetDir, { recursive: true })

run('qlmanage', ['-t', '-s', '1024', '-o', buildDir, svgPath])
const qlOutputPath = resolve(buildDir, 'icon.svg.png')
if (!existsSync(qlOutputPath)) {
  throw new Error('qlmanage did not produce icon.svg.png')
}

run('sips', ['-s', 'format', 'png', qlOutputPath, '--out', pngPath])
rmSync(qlOutputPath, { force: true })

for (const [fileName, size] of iconsetSpecs) {
  run('sips', ['-z', String(size), String(size), pngPath, '--out', resolve(iconsetDir, fileName)])
}

run('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath])

const icoEntries = icoSpecs.map(([fileName, size]) => {
  const outputPath = resolve(buildDir, `ico-${fileName}`)
  run('sips', ['-z', String(size), String(size), pngPath, '--out', outputPath])
  const buffer = readFileSync(outputPath)
  const dimensions = pngSize(buffer)
  if (dimensions.width !== size || dimensions.height !== size) {
    throw new Error(`Unexpected ICO source size for ${outputPath}`)
  }

  return { size, buffer }
})

createIco(icoEntries, icoPath)

for (const [fileName] of icoSpecs) {
  rmSync(resolve(buildDir, `ico-${fileName}`), { force: true })
}
rmSync(iconsetDir, { recursive: true, force: true })

for (const path of [pngPath, icnsPath, icoPath]) {
  if (!existsSync(path)) {
    throw new Error(`Missing generated icon ${path}`)
  }
}

console.log('Generated application icons:')
console.log(`- ${pngPath}`)
console.log(`- ${icnsPath}`)
console.log(`- ${icoPath}`)
