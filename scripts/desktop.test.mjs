import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  buildPlan,
  macPlist,
  stagePackage,
  stageDeb,
  target,
  removeStage,
  projectRoot,
} from './desktop.mjs'

const temp = mkdtempSync(path.join(os.tmpdir(), 'wsd-packaging-test-'))
after(() => {
  const resolved = realpathSync(temp)
  assert.equal(path.dirname(resolved), realpathSync(os.tmpdir()))
  assert.ok(path.basename(resolved).startsWith('wsd-packaging-test-'))
  rmSync(resolved, { recursive: true })
})

test('native build settings separate Windows linker flags and Unix CGO', () => {
  const windows = buildPlan(temp, 'win32', 'x64')
  const linux = buildPlan(temp, 'linux', 'x64')
  const mac = buildPlan(temp, 'darwin', 'arm64')
  assert.equal(windows.id, 'windows-amd64')
  assert.equal(windows.env.CGO_ENABLED, '0')
  assert.ok(windows.args.includes('-s -w -H windowsgui'))
  for (const plan of [linux, mac]) {
    assert.equal(plan.env.CGO_ENABLED, '1')
    assert.equal(
      plan.args.some((arg) => arg.includes('windowsgui')),
      false,
    )
    assert.equal(plan.binary.endsWith('.exe'), false)
  }
  assert.equal(mac.env.MACOSX_DEPLOYMENT_TARGET, '14.0')
  assert.equal(buildPlan(temp, 'linux', 'arm64', true).args.includes('production'), false)
  assert.throws(() => target('freebsd', 'x64'))
  assert.throws(() => target('linux', 'ia32'))
})

const fakeBinary = path.join(temp, 'test-build')
writeFileSync(fakeBinary, 'synthetic package-layout test binary\n')

test('macOS bundle has a real executable layout, icon and minimum OS metadata', () => {
  const directory = path.join(temp, 'mac bundle with spaces')
  stagePackage(projectRoot, { os: 'darwin', binary: fakeBinary }, directory)
  const app = path.join(directory, 'WinScript Doctor.app')
  assert.equal(
    readFileSync(path.join(app, 'Contents/MacOS/WinScriptDoctor'), 'utf8'),
    readFileSync(fakeBinary, 'utf8'),
  )
  const plist = readFileSync(path.join(app, 'Contents/Info.plist'), 'utf8')
  assert.ok(plist.includes('<key>CFBundleExecutable</key><string>WinScriptDoctor</string>'))
  assert.ok(plist.includes('<key>LSMinimumSystemVersion</key><string>14.0</string>'))
  assert.equal(
    readFileSync(path.join(app, 'Contents/Resources/appicon.icns')).subarray(0, 4).toString(),
    'icns',
  )
  assert.ok(macPlist(true).includes('dev.winscriptdoctor.desktop.development'))
  assert.ok(existsSync(path.join(directory, 'INSTALL.md')))
  assert.ok(
    readFileSync(path.join(directory, 'LICENSES/shadcn-ui-MIT.txt'), 'utf8').includes(
      'Copyright (c) 2023 shadcn',
    ),
  )
})

test('portable Linux installation ships its executable, installer and matching icon', () => {
  const directory = path.join(temp, 'linux bundle')
  stagePackage(projectRoot, { os: 'linux', binary: fakeBinary }, directory)
  assert.ok(existsSync(path.join(directory, 'winscript-doctor')))
  assert.ok(existsSync(path.join(directory, 'dev.winscriptdoctor.desktop.svg')))
  const installer = readFileSync(path.join(directory, 'install.sh'), 'utf8')
  assert.ok(installer.startsWith('#!/bin/sh\n'))
  assert.ok(installer.includes('.installed-by-winscript-doctor'))
  assert.equal(installer.includes('sudo '), false)
  assert.equal(installer.includes('\r'), false)
})

test('Debian package declares runtime libraries and correct CPU architecture', () => {
  for (const arch of ['amd64', 'arm64']) {
    const directory = path.join(temp, `deb-${arch}`)
    stageDeb(projectRoot, { os: 'linux', arch, binary: fakeBinary }, directory)
    const control = readFileSync(path.join(directory, 'DEBIAN/control'), 'utf8')
    assert.ok(control.includes(`Architecture: ${arch}\n`))
    assert.ok(control.includes('libgtk-4-1, libwebkitgtk-6.0-4'))
    const desktop = readFileSync(
      path.join(directory, 'usr/share/applications/dev.winscriptdoctor.desktop.desktop'),
      'utf8',
    )
    assert.ok(desktop.includes('Exec=/usr/bin/winscript-doctor\n'))
    assert.ok(existsSync(path.join(directory, 'usr/bin/winscript-doctor')))
    assert.ok(
      existsSync(path.join(directory, 'usr/share/doc/winscript-doctor/licenses/shadcn-ui-MIT.txt')),
    )
  }
})

test('package cleanup preserves unrelated files and accepts only its own stage', () => {
  const bin = path.join(temp, 'bin')
  mkdirSync(bin)
  const unrelated = path.join(bin, 'keep-this')
  mkdirSync(unrelated)
  writeFileSync(path.join(unrelated, 'data'), 'preserve')
  assert.throws(() => removeStage(bin, unrelated))
  assert.equal(readFileSync(path.join(unrelated, 'data'), 'utf8'), 'preserve')
  const stage = mkdtempSync(path.join(bin, '.wsd-package-'))
  removeStage(bin, stage)
  assert.equal(existsSync(stage), false)
  assert.equal(existsSync(unrelated), true)
})
