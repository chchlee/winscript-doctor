import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { packageLicenses } from './package-licenses.mjs'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const { version } = JSON.parse(
  readFileSync(path.join(projectRoot, 'frontend/src/version.json'), 'utf8'),
)
export const appID = 'dev.winscriptdoctor.desktop'

export function target(platform = process.platform, arch = process.arch) {
  const os = { win32: 'windows', windows: 'windows', linux: 'linux', darwin: 'darwin' }[platform]
  const cpu = { x64: 'amd64', amd64: 'amd64', arm64: 'arm64' }[arch]
  if (!os || !cpu) throw new Error('Windows, macOS, Linux의 amd64 또는 arm64 환경이 필요합니다.')
  return { os, arch: cpu, id: `${os}-${cpu}` }
}

export function buildPlan(root, platform, arch, dev = false) {
  const t = target(platform, arch)
  const name =
    t.os === 'windows'
      ? `WinScriptDoctor${dev ? '-dev' : ''}.exe`
      : `winscript-doctor${dev ? '-dev' : ''}`
  const binary = path.join(root, 'bin', name)
  const args = ['build', '-buildvcs=false']
  if (!dev)
    args.push(
      '-tags',
      'production',
      '-trimpath',
      '-ldflags',
      t.os === 'windows' ? '-s -w -H windowsgui' : '-s -w',
    )
  args.push('-o', binary, '.')
  const env = { GOOS: t.os, GOARCH: t.arch, CGO_ENABLED: t.os === 'windows' ? '0' : '1' }
  if (t.os === 'darwin') {
    env.MACOSX_DEPLOYMENT_TARGET = '14.0'
    env.CGO_CFLAGS = '-mmacosx-version-min=14.0'
    env.CGO_LDFLAGS = '-mmacosx-version-min=14.0'
  }
  return { ...t, root, binary, args, env, dev }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit', ...options })
  if (result.error)
    throw new Error(`${command} 실행에 필요한 개발 도구를 확인하세요.`, { cause: result.error })
  if (result.status !== 0) throw new Error(`${command} 실행 실패 (${result.status ?? '종료 신호'})`)
}

function buildFrontend(root) {
  const frontend = path.join(root, 'frontend')
  const tsc = path.join(frontend, 'node_modules/typescript/bin/tsc')
  const vite = path.join(frontend, 'node_modules/vite/bin/vite.js')
  if (!existsSync(tsc) || !existsSync(vite))
    throw new Error('먼저 frontend 폴더에서 npm ci를 실행하세요.')
  run(process.execPath, [tsc, '-b'], { cwd: frontend })
  run(process.execPath, [vite, 'build'], { cwd: frontend })
}

function build(plan) {
  buildFrontend(plan.root)
  mkdirSync(path.dirname(plan.binary), { recursive: true })
  if (plan.os === 'windows') {
    run('wails3', [
      'generate',
      'syso',
      '-arch',
      plan.arch,
      '-icon',
      'build/windows/icon.ico',
      '-manifest',
      'build/windows/app.manifest',
      '-info',
      'build/windows/info.json',
      '-out',
      `app_windows_${plan.arch}.syso`,
    ])
  }
  if (plan.os === 'linux') run('pkg-config', ['--exists', 'gtk4', 'webkitgtk-6.0'])
  run('go', plan.args, { env: { ...process.env, ...plan.env } })
  console.log(`빌드 완료: ${plan.binary}`)
}

function copy(source, destination, executable = false) {
  mkdirSync(path.dirname(destination), { recursive: true })
  copyFileSync(source, destination)
  if (executable) chmodSync(destination, 0o755)
}

export function macPlist(dev = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>WinScript Doctor</string>
  <key>CFBundleDisplayName</key><string>WinScript Doctor</string>
  <key>CFBundleIdentifier</key><string>${appID}${dev ? '.development' : ''}</string>
  <key>CFBundleExecutable</key><string>WinScriptDoctor</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>CFBundleIconFile</key><string>appicon.icns</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSSupportsAutomaticGraphicsSwitching</key><true/>
</dict></plist>\n`
}

export function makeMacBundle(root, binary, app, dev = false) {
  copy(binary, path.join(app, 'Contents/MacOS/WinScriptDoctor'), true)
  copy(
    path.join(root, 'build/darwin/appicon.icns'),
    path.join(app, 'Contents/Resources/appicon.icns'),
  )
  writeFileSync(path.join(app, 'Contents/Info.plist'), macPlist(dev))
  writeFileSync(path.join(app, 'Contents/PkgInfo'), 'APPL????')
  return app
}

export function desktopEntry(exec = '/usr/bin/winscript-doctor') {
  return `[Desktop Entry]\nType=Application\nName=WinScript Doctor\nComment=Windows script snapshot diagnostics\nExec=${exec}\nIcon=${appID}\nTerminal=false\nCategories=Development;System;\nStartupNotify=true\n`
}

export function stagePackage(root, plan, directory) {
  mkdirSync(directory, { recursive: true })
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'LICENSES/shadcn-ui-MIT.txt'])
    copy(path.join(root, file), path.join(directory, file))
  copy(path.join(root, 'docs/installation.md'), path.join(directory, 'INSTALL.md'))
  if (plan.os === 'darwin')
    makeMacBundle(root, plan.binary, path.join(directory, 'WinScript Doctor.app'))
  else {
    copy(
      plan.binary,
      path.join(directory, plan.os === 'windows' ? 'WinScriptDoctor.exe' : 'winscript-doctor'),
      true,
    )
    if (plan.os === 'linux') {
      copy(path.join(root, 'frontend/public/icon.svg'), path.join(directory, `${appID}.svg`))
      copy(path.join(root, 'scripts/install-linux.sh'), path.join(directory, 'install.sh'), true)
    }
  }
}

export function stageDeb(root, plan, directory) {
  if (plan.os !== 'linux') throw new Error('Debian 패키지는 Linux 빌드에서만 생성합니다.')
  copy(plan.binary, path.join(directory, 'usr/bin/winscript-doctor'), true)
  copy(
    path.join(root, 'frontend/public/icon.svg'),
    path.join(directory, `usr/share/icons/hicolor/scalable/apps/${appID}.svg`),
  )
  mkdirSync(path.join(directory, 'usr/share/applications'), { recursive: true })
  writeFileSync(path.join(directory, `usr/share/applications/${appID}.desktop`), desktopEntry())
  copy(path.join(root, 'LICENSE'), path.join(directory, 'usr/share/doc/winscript-doctor/copyright'))
  copy(
    path.join(root, 'LICENSES/shadcn-ui-MIT.txt'),
    path.join(directory, 'usr/share/doc/winscript-doctor/licenses/shadcn-ui-MIT.txt'),
  )
  mkdirSync(path.join(directory, 'DEBIAN'), { recursive: true })
  writeFileSync(
    path.join(directory, 'DEBIAN/control'),
    `Package: winscript-doctor
Version: ${version}
Architecture: ${plan.arch}
Maintainer: WinScript Doctor contributors
Section: utils
Priority: optional
Depends: libc6 (>= 2.39), libgtk-4-1, libwebkitgtk-6.0-4
Recommends: fonts-noto-cjk
Installed-Size: ${Math.ceil(statSync(plan.binary).size / 1024) + 32}
Description: Windows script snapshot diagnostics
 Browse and compare PowerShell and BAT execution context snapshots locally.
`,
  )
}

function signWindows(plan, file) {
  run('pwsh.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-File',
    path.join(plan.root, 'scripts/sign-windows.ps1'),
    ...(file ? ['-Target', file] : []),
  ])
}

function makeWindowsInstaller(plan, stage, payload, destination, signed) {
  const build = path.join(stage, 'installer')
  const installerPayload = path.join(build, 'payload')
  for (const file of [
    'WinScriptDoctor.exe',
    'LICENSE',
    'INSTALL.md',
    'THIRD_PARTY_NOTICES.md',
    'THIRD-PARTY-LICENSES.txt',
    'LICENSES/shadcn-ui-MIT.txt',
  ])
    copy(path.join(payload, file), path.join(installerPayload, file))
  copy(path.join(plan.root, 'LICENSES/nsis.txt'), path.join(installerPayload, 'LICENSES/nsis.txt'))
  copy(path.join(plan.root, 'build/windows/installer.nsi'), path.join(build, 'installer.nsi'))
  copy(path.join(plan.root, 'build/windows/icon.ico'), path.join(build, 'icon.ico'))
  if (signed)
    copy(path.join(plan.root, 'scripts/sign-windows.ps1'), path.join(build, 'sign-windows.ps1'))
  const compiler =
    process.env.WSD_MAKENSIS ?? path.join(plan.root, '.local/nsis-tools/nsis-3.13/makensis.exe')
  run(
    compiler,
    [
      '/INPUTCHARSET',
      'UTF8',
      '/V2',
      '/WX',
      `/DAPP_VERSION=${version}`,
      ...(signed ? ['/DWSD_SIGN_UNINSTALLER'] : []),
      'installer.nsi',
    ],
    { cwd: build },
  )
  const setup = path.join(build, 'WinScriptDoctorInstaller.exe')
  if (signed) signWindows(plan, setup)
  copy(setup, destination)
}

// Only remove temporary package directories allocated by this invocation.
export function removeStage(bin, stage) {
  const base = realpathSync(bin)
  const resolved = realpathSync(stage)
  if (
    lstatSync(stage).isSymbolicLink() ||
    path.dirname(resolved) !== base ||
    !path.basename(resolved).startsWith('.wsd-package-')
  ) {
    throw new Error('패키지 임시 폴더 범위를 벗어난 정리 요청을 거부했습니다.')
  }
  rmSync(resolved, { recursive: true })
}

function checksum(file) {
  const digest = createHash('sha256').update(readFileSync(file)).digest('hex')
  writeFileSync(`${file}.sha256`, `${digest}  ${path.basename(file)}\n`)
}

function packageDesktop(plan) {
  if (plan.dev) throw new Error('개발 빌드는 배포 패키지로 만들 수 없습니다.')
  if (!existsSync(plan.binary)) throw new Error('먼저 node scripts/desktop.mjs build를 실행하세요.')
  const bin = path.join(plan.root, 'bin')
  const signed = plan.os === 'windows' && Boolean(process.env.WSD_SIGNING_THUMBPRINT)
  if (signed) signWindows(plan)
  const output = path.join(bin, signed ? 'signed-packages' : 'packages')
  mkdirSync(output, { recursive: true })
  const stage = mkdtempSync(path.join(bin, '.wsd-package-'))
  const name = `WinScriptDoctor-${version}-${plan.id}`
  const payload = path.join(stage, name)
  try {
    stagePackage(plan.root, plan, payload)
    if (signed) signWindows(plan, path.join(payload, 'WinScriptDoctor.exe'))
    const licenses = packageLicenses(plan)
    writeFileSync(path.join(payload, 'THIRD-PARTY-LICENSES.txt'), licenses)
    const extension = plan.os === 'linux' ? '.tar.gz' : '.zip'
    const archive = path.join(stage, `${name}${extension}`)
    if (plan.os === 'darwin') {
      // Ad-hoc signing enables locally built Apple Silicon apps. Developer ID
      // signing/notarization for public distribution remains a separate step.
      run('codesign', [
        '--force',
        '--deep',
        '--sign',
        '-',
        path.join(payload, 'WinScript Doctor.app'),
      ])
      run('codesign', [
        '--verify',
        '--deep',
        '--strict',
        path.join(payload, 'WinScript Doctor.app'),
      ])
      run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', payload, archive])
    } else
      run('tar', [
        plan.os === 'linux' ? '-czf' : '-a',
        ...(plan.os === 'linux' ? [] : ['-cf']),
        archive,
        '-C',
        stage,
        name,
      ])
    if (plan.os === 'windows' && plan.arch === 'amd64') {
      const installer = path.join(output, `${name}-setup.exe`)
      makeWindowsInstaller(plan, stage, payload, installer, signed)
      checksum(installer)
    }
    const packagedArchive = path.join(output, path.basename(archive))
    copy(archive, packagedArchive)
    checksum(packagedArchive)
    if (plan.os === 'linux') {
      const debStage = path.join(stage, 'debian')
      stageDeb(plan.root, plan, debStage)
      writeFileSync(
        path.join(debStage, 'usr/share/doc/winscript-doctor/THIRD-PARTY-LICENSES.txt'),
        licenses,
      )
      const deb = path.join(output, `winscript-doctor_${version}_${plan.arch}.deb`)
      run('dpkg-deb', ['--build', '--root-owner-group', debStage, deb])
      checksum(deb)
    }
    console.log(`설치 패키지: ${output}`)
  } finally {
    removeStage(bin, stage)
  }
}

function runApp(plan) {
  let binary = plan.binary
  if (!existsSync(binary)) throw new Error('먼저 해당 플랫폼에서 앱을 빌드하세요.')
  if (plan.os === 'darwin') {
    const bundle = makeMacBundle(
      plan.root,
      binary,
      path.join(plan.root, 'bin', `WinScriptDoctor${plan.dev ? '-dev' : ''}.app`),
      plan.dev,
    )
    run('codesign', ['--force', '--deep', '--sign', '-', bundle])
    binary = path.join(bundle, 'Contents/MacOS/WinScriptDoctor')
  }
  run(binary, [])
}

export function cli(args = process.argv.slice(2)) {
  const command = args[0] ?? 'build'
  if (
    !['build', 'package', 'run'].includes(command) ||
    args.slice(1).some((arg) => arg !== '--dev')
  ) {
    throw new Error('사용법: node scripts/desktop.mjs build|package|run [--dev]')
  }
  const plan = buildPlan(projectRoot, process.platform, process.arch, args.includes('--dev'))
  if (command === 'build') build(plan)
  else if (command === 'package') packageDesktop(plan)
  else runApp(plan)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    cli()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
