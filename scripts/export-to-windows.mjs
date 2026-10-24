// Builds the Edge extension and copies it to the Windows Desktop under a single
// container folder:
//
//   programs/web-extension/
//   ├── <extension-name>-edge.zip   zipped copy for backup / transfer
//   └── <extension-name>/           unpacked folder for "Load unpacked"
//
// <extension-name> comes from package.json "name". The Windows user is detected
// at runtime, so the path is never hard-coded to one machine.
//
// Works from WSL (copies over /mnt/c) or from native Windows. Any other OS is a
// no-op error, since there is no Windows Desktop to copy to.
//
// NOTE: Edge developer mode ("Load unpacked") needs the UNPACKED FOLDER. A .zip
// cannot be loaded directly in Edge/Chrome - extract it first. The zip is only
// for storing or sending the build.
//
// Usage: pnpm run bundle:win  (optionally: -- --browser=chrome)
import {execFileSync} from 'node:child_process'
import {cpSync, existsSync, mkdirSync, rmSync} from 'node:fs'
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {posix as posixPath} from 'node:path'
import os from 'node:os'
import {fileURLToPath} from 'node:url'

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(
  readFileSync(resolve(projectDir, 'package.json'), 'utf8')
)
const extName = pkg.name

// --browser=edge (default). Keeps parity with the original edge-only script
// while letting you target chrome instead.
const browserArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--browser='))
const browser = browserArg ? browserArg.split('=')[1] : 'edge'

const zipName = `${extName}-${browser}.zip`
const buildRoot = 'build-win'
const srcDir = resolve(projectDir, buildRoot, browser)
const srcZip = resolve(projectDir, buildRoot, zipName)

function fail(message, ...hints) {
  console.error(`!! ${message}`)
  for (const hint of hints) console.error(`   ${hint}`)
  process.exit(1)
}

const isWindows = process.platform === 'win32'
const isWSL =
  process.platform === 'linux' &&
  (process.env.WSL_DISTRO_NAME != null ||
    (() => {
      try {
        return /microsoft/i.test(readFileSync('/proc/version', 'utf8'))
      } catch {
        return false
      }
    })())

if (!isWindows && !isWSL) {
  fail(
    'This script copies the build to the Windows Desktop.',
    'Run it on Windows or inside WSL with the C: drive mounted.'
  )
}

// Resolve the Windows user's Desktop, falling back to a OneDrive-redirected
// Desktop when the classic one is missing.
function resolveDesktop() {
  if (isWindows) {
    const home = os.homedir()
    const classic = resolve(home, 'Desktop')
    const oneDrive = resolve(home, 'OneDrive', 'Desktop')
    if (existsSync(classic)) return classic
    if (existsSync(oneDrive)) return oneDrive
    fail(`No Desktop folder under ${home}`)
  }

  // WSL: ask Windows for the profile path, then translate it to /mnt/c/...
  // cwd is set to a Windows path so cmd.exe does not warn about UNC paths.
  let winProfile
  try {
    winProfile = execFileSync('cmd.exe', ['/c', 'echo %USERPROFILE%'], {
      cwd: '/mnt/c',
      encoding: 'utf8'
    }).trim()
  } catch {
    fail('Could not run cmd.exe to find the Windows user profile.')
  }

  const profile = execFileSync('wslpath', ['-u', winProfile], {
    encoding: 'utf8'
  }).trim()

  const classic = posixPath.join(profile, 'Desktop')
  const oneDrive = posixPath.join(profile, 'OneDrive', 'Desktop')
  if (existsSync(classic)) return classic
  if (existsSync(oneDrive)) return oneDrive
  fail(`No Desktop folder under ${profile}`)
}

const desktop = resolveDesktop()
const join = isWindows ? resolve : posixPath.join
const container = join(desktop, 'programs', 'web-extension')
const destDir = join(container, extName)

console.log(`==> Building ${browser} bundle (unpacked folder + zip)…`)
rmSync(resolve(projectDir, buildRoot), {recursive: true, force: true})

const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm'
execFileSync(
  pnpm,
  [
    'exec',
    'extension',
    'build',
    '--browser',
    browser,
    '--out-dir',
    buildRoot,
    '--zip',
    '--zip-filename',
    extName
  ],
  {cwd: projectDir, stdio: 'inherit'}
)

if (!existsSync(resolve(srcDir, 'manifest.json'))) {
  fail(`Build did not produce ${srcDir}/manifest.json`)
}

console.log(`==> Updating ${destDir}`)
// Replace only THIS extension's folder, so a removed file never lingers, while
// leaving the container and any other extensions beside it untouched.
rmSync(destDir, {recursive: true, force: true})
mkdirSync(destDir, {recursive: true})

console.log(`==> Copying unpacked folder to ${destDir}`)
cpSync(srcDir, destDir, {recursive: true})

if (existsSync(srcZip)) {
  const destZip = join(container, zipName)
  console.log(`==> Copying zip to ${destZip}`)
  cpSync(srcZip, destZip)
}

// Show the Windows-style path so it can be pasted into Explorer.
const winContainer = isWindows
  ? container
  : execFileSync('wslpath', ['-w', container], {encoding: 'utf8'}).trim()

console.log('==> Done.')
console.log(`   Container: ${winContainer}`)
console.log(`   Unpacked:  ${winContainer}\\${extName}`)
console.log(`   Zip:       ${winContainer}\\${zipName}`)
console.log('')
console.log(`   To load it in ${browser} (developer mode uses the FOLDER, not the zip):`)
console.log(`     1. Open ${browser}://extensions`)
console.log('     2. Turn on "Developer mode"')
console.log(`     3. Click "Load unpacked" and pick the ${extName} folder`)
console.log('     4. Re-run this script and click the extension\'s refresh icon to update')
