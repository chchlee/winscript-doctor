import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import demoFixture from '../../../fixtures/demo-workspace.json'
import {
  MAX_SNAPSHOT_BYTES,
  compareContexts,
  exportWorkspace,
  isDesktop,
  loadWorkspace,
  openWorkspace,
  parseSnapshot,
  type Workspace,
} from './doctor'

const { nativeCall } = vi.hoisted(() => ({ nativeCall: vi.fn() }))
vi.mock('@wailsio/runtime', () => ({ Call: { ByName: nativeCall } }))

const chromeDescriptor = Object.getOwnPropertyDescriptor(window, 'chrome')
const webkitDescriptor = Object.getOwnPropertyDescriptor(window, 'webkit')
const wailsDescriptor = Object.getOwnPropertyDescriptor(window, '_wails')

function nativeTransport(transport = 'WebView2') {
  Object.defineProperty(window, transport === 'WebView2' ? 'chrome' : 'webkit', {
    configurable: true,
    value:
      transport === 'WebView2'
        ? { webview: { postMessage: vi.fn() } }
        : { messageHandlers: { external: { postMessage: vi.fn() } } },
  })
}

beforeEach(() => {
  Object.defineProperty(window, 'chrome', { configurable: true, value: undefined })
  Object.defineProperty(window, 'webkit', { configurable: true, value: undefined })
  nativeCall.mockReset()
})

afterEach(() => {
  if (chromeDescriptor) Object.defineProperty(window, 'chrome', chromeDescriptor)
  else Reflect.deleteProperty(window, 'chrome')
  if (webkitDescriptor) Object.defineProperty(window, 'webkit', webkitDescriptor)
  else Reflect.deleteProperty(window, 'webkit')
  if (wailsDescriptor) Object.defineProperty(window, '_wails', wailsDescriptor)
  else Reflect.deleteProperty(window, '_wails')
  vi.restoreAllMocks()
})

describe('browser and native adapters', () => {
  it('does not mistake a runtime-created _wails object for a native host', () => {
    Reflect.set(window, '_wails', { Call: {} })
    expect(isDesktop()).toBe(false)
    nativeTransport()
    expect(isDesktop()).toBe(true)
  })

  it('returns independent clones of the one shared demo fixture', async () => {
    const first = await loadWorkspace()
    first.scripts[0].name = 'changed.ps1'
    const second = await loadWorkspace()
    expect(second.scripts[0].name).toBe('backup.ps1')
    expect(second.scripts).toHaveLength(6)
    expect(nativeCall).not.toHaveBeenCalled()
    expect(await openWorkspace()).toBeNull()
  })

  it('does not treat a browser WebKit namespace as an application bridge', () => {
    Object.defineProperty(window, 'webkit', { configurable: true, value: { messageHandlers: {} } })
    expect(isDesktop()).toBe(false)
  })

  it.each(['WebView2', 'WebKit'])('uses every native service through %s', async (transport) => {
    nativeTransport(transport)
    nativeCall.mockResolvedValueOnce(structuredClone(demoFixture))
    const workspace = await loadWorkspace()
    expect(nativeCall).toHaveBeenLastCalledWith('main.DoctorService.GetWorkspace')
    const raw = JSON.stringify(workspace)
    nativeCall.mockResolvedValueOnce(workspace)
    await parseSnapshot(raw)
    expect(nativeCall).toHaveBeenLastCalledWith('main.DoctorService.ParseSnapshot', raw)
    nativeCall.mockResolvedValueOnce(null)
    expect(await openWorkspace()).toBeNull()
    expect(nativeCall).toHaveBeenLastCalledWith('main.DoctorService.OpenWorkspace')
    nativeCall.mockResolvedValueOnce({ rows: [], changeCount: 0, unknownCount: 0 })
    await compareContexts(workspace.comparisons[0].manual, workspace.comparisons[0].scheduled)
    expect(nativeCall).toHaveBeenLastCalledWith(
      'main.DoctorService.Compare',
      workspace.comparisons[0].manual,
      workspace.comparisons[0].scheduled,
    )
    nativeCall.mockResolvedValueOnce(true)
    expect(await exportWorkspace(workspace)).toBe(true)
    expect(nativeCall).toHaveBeenLastCalledWith('main.DoctorService.ExportWorkspace', workspace)
  })
})

describe('snapshot import boundary', () => {
  it('accepts round trips and normalizes missing or null collections', async () => {
    const workspace = await loadWorkspace()
    expect(await parseSnapshot(JSON.stringify(workspace))).toEqual(workspace)
    const empty = await parseSnapshot(
      JSON.stringify({
        schemaVersion: 1,
        id: 'empty',
        host: workspace.host,
        scripts: null,
        findings: null,
      }),
    )
    expect(empty.scripts).toEqual([])
    expect(empty.findings).toEqual([])
    expect(empty.comparisons).toEqual([])
    expect(empty.demo).toBe(false)
  })

  it('rejects unknown credential fields without exposing their contents', async () => {
    const secret = 'SENTINEL_DO_NOT_ECHO_94da3a'
    for (const input of [
      { ...demoFixture, credentials: { token: secret } },
      { ...demoFixture, host: { ...demoFixture.host, password: secret } },
    ]) {
      const error = await parseSnapshot(JSON.stringify(input)).catch((reason: unknown) => reason)
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain(secret)
      expect((error as Error).message).not.toContain('password')
      expect((error as Error).message).not.toContain('credentials')
    }
  })

  it.each([
    [
      'schema version',
      (w: Workspace) => {
        Reflect.set(w, 'schemaVersion', 2)
      },
    ],
    [
      'script ID',
      (w: Workspace) => {
        w.scripts[1].id = w.scripts[0].id
      },
    ],
    [
      'finding ID',
      (w: Workspace) => {
        w.findings[1].id = w.findings[0].id
      },
    ],
    [
      'comparison ID',
      (w: Workspace) => {
        w.comparisons[1].id = w.comparisons[0].id
      },
    ],
    [
      'script reference',
      (w: Workspace) => {
        w.findings[0].scriptId = 'missing'
      },
    ],
    [
      'comparison reference',
      (w: Workspace) => {
        w.comparisons[0].taskName = 'wrong-task'
      },
    ],
    [
      'status',
      (w: Workspace) => {
        Reflect.set(w.scripts[0], 'status', 'probably safe')
      },
    ],
    [
      'evidence state',
      (w: Workspace) => {
        Reflect.set(w.findings[0], 'evidenceState', 'certain cause')
      },
    ],
    [
      'permission',
      (w: Workspace) => {
        Reflect.set(w.host, 'permission', 'admin maybe')
      },
    ],
    [
      'capture date',
      (w: Workspace) => {
        w.comparisons[0].scheduled.capturedAt = 'yesterday'
      },
    ],
    [
      'calendar date',
      (w: Workspace) => {
        w.host.collectedAt = '2026-02-30T09:00:00+09:00'
      },
    ],
    [
      'oversize path',
      (w: Workspace) => {
        w.scripts[0].path = 'a'.repeat(4097)
      },
    ],
    [
      'control characters',
      (w: Workspace) => {
        w.scripts[0].name = 'bad\0.ps1'
      },
    ],
  ])('rejects invalid %s', async (_, mutate) => {
    const workspace = await loadWorkspace()
    mutate(workspace)
    await expect(parseSnapshot(JSON.stringify(workspace))).rejects.toThrow()
  })

  it('enforces UTF-8 byte limits before parsing and rejects malformed documents', async () => {
    await expect(
      parseSnapshot('가'.repeat(Math.floor(MAX_SNAPSHOT_BYTES / 3) + 1)),
    ).rejects.toThrow('스냅샷 크기')
    for (const raw of [
      '',
      'null',
      '[{}]',
      '{"schemaVersion":',
      JSON.stringify(demoFixture) + ' {}',
    ]) {
      await expect(parseSnapshot(raw)).rejects.toThrow()
    }
  })

  it('rejects ambiguous comparison targets while allowing repeated names in inventories', async () => {
    const workspace = await loadWorkspace()
    workspace.scripts.push({
      ...workspace.scripts[0],
      id: 'another-backup',
      path: 'E:/DifferentFolder/backup.ps1',
    })
    await expect(parseSnapshot(JSON.stringify(workspace))).rejects.toThrow()
    workspace.comparisons = []
    await expect(parseSnapshot(JSON.stringify(workspace))).resolves.toMatchObject({
      scripts: expect.arrayContaining([expect.objectContaining({ id: 'another-backup' })]),
    })
  })

  it('resolves comparison targets by both task name and script name', async () => {
    const workspace = await loadWorkspace()
    workspace.scripts.push({
      ...workspace.scripts[0],
      id: 'different-task-backup',
      taskName: 'DifferentBackup',
      path: 'E:/DifferentFolder/backup.ps1',
    })
    await expect(parseSnapshot(JSON.stringify(workspace))).resolves.toMatchObject({
      id: workspace.id,
    })
  })

  it.each([
    ['info', 'observed', true],
    ['info', 'candidate', false],
    ['info', 'unknown', false],
    ['warning', 'observed', false],
    ['warning', 'candidate', false],
    ['warning', 'unknown', false],
    ['danger', 'observed', false],
    ['danger', 'candidate', false],
    ['danger', 'unknown', false],
  ] as const)(
    'checks healthy status against %s and %s findings',
    async (severity, evidenceState, allowed) => {
      const workspace = await loadWorkspace()
      workspace.scripts[0].status = 'healthy'
      workspace.findings = [{ ...workspace.findings[0], severity, evidenceState }]
      const result = parseSnapshot(JSON.stringify(workspace))
      if (allowed) {
        await expect(result).resolves.toMatchObject({ id: workspace.id })
      } else {
        await expect(result).rejects.toThrow('스크립트 상태와 연결된 진단 결과가 일치하지 않습니다')
      }
    },
  )
})

describe('snapshot export round-trip size', () => {
  it('does not inflate a valid near-limit snapshot past the import limit', async () => {
    const workspace = await loadWorkspace()
    workspace.findings = []
    workspace.comparisons = []
    workspace.scripts = Array.from({ length: 6800 }, (_, index) => ({
      id: 'script-' + index,
      name: 'script-' + index + '.ps1',
      path: 'D:/Scripts/script-' + index + '.ps1',
      engine: 'PowerShell' as const,
      taskName: 'Task' + index,
      status: 'healthy' as const,
      lastRun: '',
      description: 'a'.repeat(64),
    }))
    expect(new TextEncoder().encode(JSON.stringify(workspace)).byteLength).toBeLessThan(
      MAX_SNAPSHOT_BYTES,
    )
    expect(new TextEncoder().encode(JSON.stringify(workspace, null, 2)).byteLength).toBeGreaterThan(
      MAX_SNAPSHOT_BYTES,
    )
    const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const create = vi.fn<(blob: Blob) => string>().mockReturnValue('blob:wsd-test')
    const revoke = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.useFakeTimers()
    try {
      expect(await exportWorkspace(workspace)).toBe(true)
      const blob = create.mock.calls[0][0]
      expect(blob.size).toBeLessThanOrEqual(MAX_SNAPSHOT_BYTES)
      vi.runOnlyPendingTimers()
      expect(revoke).toHaveBeenCalledWith('blob:wsd-test')
    } finally {
      vi.useRealTimers()
      if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })
})

describe('context comparison parity with Go', () => {
  it('reports six observed changes, one unobserved field and one matching field', async () => {
    const workspace = await loadWorkspace()
    const pair = workspace.comparisons[0]
    const result = await compareContexts(pair.manual, pair.scheduled)
    expect(result.rows).toHaveLength(8)
    expect(result.changeCount).toBe(6)
    expect(result.unknownCount).toBe(1)
    expect(result.rows.find((row) => row.key === 'networkAccess')?.status).toBe('unknown')
    expect(result.rows.find((row) => row.key === 'architecture')?.status).toBe('same')
  })

  it('compares ordinary Windows paths without confusing C: and C:\\', async () => {
    const { manual: left } = (await loadWorkspace()).comparisons[0]
    const right = structuredClone(left)
    right.account = left.account.toLowerCase()
    right.engine = left.engine.toUpperCase().replaceAll('\\', '/')
    right.workingDirectory = 'd:/ops/scripts/'
    const equal = await compareContexts(left, right)
    expect(equal.changeCount).toBe(0)
    left.workingDirectory = 'C:'
    right.workingDirectory = 'C:\\'
    expect((await compareContexts(left, right)).changeCount).toBe(1)
  })

  it('preserves module search order and does not count missing values as differences', async () => {
    const { manual: left } = (await loadWorkspace()).comparisons[0]
    const right = structuredClone(left)
    right.modulePaths.reverse()
    expect((await compareContexts(left, right)).changeCount).toBe(1)
    right.modulePaths = []
    right.account = ''
    right.networkAccess = 'unknown'
    const unknown = await compareContexts(left, right)
    expect(unknown.changeCount).toBe(0)
    expect(unknown.unknownCount).toBe(3)
    expect(left.modulePaths[0]).toContain('kim.admin')
  })
})
