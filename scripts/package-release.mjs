// Builds a production, zipped bundle for every target browser and leaves the
// zips in release/ — ready to attach to a GitHub release in CI.
//
//   release/
//   ├── <extension-name>-<version>-chrome.zip
//   ├── <extension-name>-<version>-edge.zip
//   └── <extension-name>-<version>-firefox.zip
//
// Name and version come from package.json, so a bump needs no edit here. The
// unpacked folders are removed afterwards, so only the zip artifacts remain.
//
// Exits non-zero if any build fails or a zip is missing, so CI stops on error.
//
// Usage: pnpm run release
import {execFileSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, rmSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(
  readFileSync(resolve(projectDir, 'package.json'), 'utf8')
)
const extName = pkg.name
const version = pkg.version

const browsers = ['chrome', 'edge', 'firefox']
const outDir = 'release'
const outPath = resolve(projectDir, outDir)
const zipBase = `${extName}-${version}`

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

// Start from a clean release/ so a stale artifact from a previous version never
// ships alongside the current one.
rmSync(outPath, {recursive: true, force: true})

const zips = []

for (const browser of browsers) {
  console.log(`==> Building ${browser} (${zipBase})…`)
  execFileSync(
    pnpm,
    [
      'exec',
      'extension',
      'build',
      '--browser',
      browser,
      '--out-dir',
      outDir,
      '--zip',
      '--zip-filename',
      zipBase
    ],
    {cwd: projectDir, stdio: 'inherit'}
  )

  // extension build names the zip <zip-filename>-<browser>.zip; fall back to a
  // directory scan if that convention ever changes.
  const expected = resolve(outPath, `${zipBase}-${browser}.zip`)
  const zipPath = existsSync(expected)
    ? expected
    : (() => {
        const found = readdirSync(outPath).find(
          (name) => name.endsWith(`-${browser}.zip`)
        )
        return found ? resolve(outPath, found) : undefined
      })()

  if (!zipPath) {
    console.error(`!! No zip produced for ${browser} in ${outDir}/`)
    process.exit(1)
  }

  zips.push(zipPath)

  // Drop the unpacked folder; CI only needs the zips.
  rmSync(resolve(outPath, browser), {recursive: true, force: true})
}

console.log('')
console.log(`==> Done. ${zips.length} artifact(s) in ${outDir}/`)
for (const zip of zips) console.log(`   ${zip}`)
