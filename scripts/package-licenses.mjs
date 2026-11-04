import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

function go(plan, ...args) {
  const result = spawnSync('go', args, {
    cwd: plan.root,
    env: { ...process.env, ...plan.env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (result.status !== 0) throw new Error('Go 배포 의존성을 확인하지 못했습니다.')
  return result.stdout.trim()
}

export function packageLicenses(plan) {
  const sections = new Map()
  function add(label, dir, fallback) {
    const files = readdirSync(dir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() && /^(licen[sc]e|copying|notice|patents)([.-].*)?$/i.test(entry.name),
      )
      .map((entry) => path.join(dir, entry.name))
      .sort()
    if (!files.length && fallback) files.push(fallback)
    if (!files.length) throw new Error(`${label} 라이선스 파일을 찾지 못했습니다.`)
    const body = files.map((file) => readFileSync(file, 'utf8').trim()).join('\n\n')
    const labels = sections.get(body) ?? new Set()
    labels.add(label)
    sections.set(body, labels)
  }
  add(`Go standard library (${go(plan, 'env', 'GOVERSION')})`, go(plan, 'env', 'GOROOT'))
  const template = '{{with .Module}}{{if not .Main}}{{.Path}}|{{.Version}}|{{.Dir}}{{end}}{{end}}'
  const modules = [
    ...new Set(
      go(plan, 'list', '-deps', '-tags', 'production', '-f', template, '.')
        .split(/\r?\n/)
        .filter(Boolean),
    ),
  ].sort()
  let wailsDir
  for (const line of modules) {
    const [name, version, dir] = line.split('|')
    add(`${name}@${version}`, dir)
    if (name === 'github.com/wailsapp/wails/v3') wailsDir = dir
  }
  const frontend = path.join(plan.root, 'frontend')
  const lock = JSON.parse(readFileSync(path.join(frontend, 'package-lock.json'), 'utf8'))
  for (const [key, metadata] of Object.entries(lock.packages).sort()) {
    if (!key || metadata.dev) continue
    const dir = path.join(frontend, key)
    if (metadata.optional && !existsSync(dir)) continue
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
    const fallback =
      pkg.name === '@wailsio/runtime' && wailsDir
        ? path.join(wailsDir, 'LICENSE')
        : pkg.name === 'react-remove-scroll-bar' && pkg.version === '2.3.8'
          ? path.join(plan.root, 'LICENSES/react-remove-scroll-bar-MIT.txt')
          : undefined
    add(`${pkg.name}@${pkg.version}`, dir, fallback)
  }
  const blocks = [...sections].map(
    ([body, labels]) => `-----\n${[...labels].sort().join('\n')}\n\n${body}\n`,
  )
  return 'WinScript Doctor — dependency notices\n\n' + blocks.join('\n')
}
