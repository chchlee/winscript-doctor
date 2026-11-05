import demoFixture from '../../../fixtures/demo-workspace.json'
import { savedLanguage } from './language'

export interface Workspace {
  schemaVersion: 1 | 2
  id: string
  demo: boolean
  host: {
    name: string
    os: string
    account: string
    permission: 'standard' | 'elevated' | 'unknown'
    collectedAt: string
  }
  scripts: Script[]
  findings: Finding[]
  comparisons: ContextPair[]
  collection?: Collection
}

export interface Script {
  id: string
  name: string
  path: string
  engine: 'PowerShell' | 'Batch' | 'Shell'
  taskName: string
  status: 'attention' | 'healthy' | 'unknown'
  lastRun: string
  description: string
  sha256?: string
  taskLinks?: TaskLink[]
}

export interface TaskLink {
  name: string
  action: number
  executable: string
  workingDirectory: string
  account: string
  logonType: string
  lastRunTime: string
  lastResult: string
}

export const collectionIssueLabels = {
  directory_unreadable: '폴더 또는 파일 읽기 실패',
  metadata_limit: '메타데이터 형식·길이 제한',
  hash_failed: '파일 해시 읽기 실패',
  file_changed: '수집 중 파일 변경',
  entry_limit: '폴더 탐색 항목 수 제한',
  script_limit: '스크립트 수 제한',
  hash_budget: '전체 해시 읽기 용량 제한',
  file_size_limit: '파일별 해시 용량 제한',
  reparse_skipped: '링크·재분석 지점 제외',
  task_read_failed: '예약 작업 일부 조회 실패',
  task_limit: '예약 작업 탐색 범위 제한',
  task_unresolved: '동적·지원하지 않는 스크립트 호출',
  link_limit: '파일별 예약 작업 참조 수 제한',
  snapshot_limit: '저장 크기에 따른 항목 제외',
  time_limit: '수집 시간 제한',
} as const

export interface Collection {
  root: string
  startedAt: string
  completedAt: string
  status: 'complete' | 'partial' | 'cancelled'
  taskStatus: 'complete' | 'partial' | 'unavailable' | 'not_applicable'
  examinedTasks: number
  issues: { code: keyof typeof collectionIssueLabels; count: number }[]
}

export async function collectionCapabilities(): Promise<{
  localCollection: boolean
  serverFiles: boolean
}> {
  if (!isDesktop()) return { localCollection: false, serverFiles: false }
  const result = await nativeCall<{ localCollection: boolean; serverFiles?: boolean }>(
    'GetCapabilities',
  )
  return {
    localCollection: result.localCollection === true,
    serverFiles: result.serverFiles === true,
  }
}

export async function collectLocal(): Promise<Workspace | null> {
  if (!isDesktop()) throw new Error('데스크톱 앱에서 수집할 수 있습니다')
  const result = await nativeFileCall<unknown>('CollectLocal')
  return result == null ? null : validateWorkspace(result)
}

export async function cancelCollection(): Promise<boolean> {
  return isDesktop() ? nativeCall<boolean>('CancelCollection') : false
}

export interface Finding {
  id: string
  ruleId: string
  title: string
  explanation: string
  scriptId: string
  severity: 'warning' | 'danger' | 'info'
  evidenceState: 'candidate' | 'observed' | 'unknown'
  nextStep: string
  evidence: string[]
}

export interface ExecutionContext {
  label: string
  captureMethod: string
  capturedAt: string
  account: string
  logonType: string
  engine: string
  version: string
  architecture: string
  workingDirectory: string
  modulePaths: string[]
  networkAccess: string
}

export interface ContextPair {
  id: string
  taskName: string
  scriptName: string
  manual: ExecutionContext
  scheduled: ExecutionContext
}

export interface ComparisonRow {
  key: string
  label: string
  left: string
  right: string
  status: 'changed' | 'same' | 'unknown'
  note: string
}

export interface ComparisonResult {
  rows: ComparisonRow[]
  changeCount: number
  unknownCount: number
}

export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024

// The npm runtime can create _wails even in a normal browser. Detect the native
// WebView2 (Windows) or WebKit message handler (macOS/Linux) instead.
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false
  const host = window as Window & {
    chrome?: { webview?: { postMessage?: unknown } }
    webkit?: { messageHandlers?: { external?: { postMessage?: unknown } } }
  }
  return (
    typeof host.chrome?.webview?.postMessage === 'function' ||
    typeof host.webkit?.messageHandlers?.external?.postMessage === 'function'
  )
}

async function nativeCall<T>(method: string, ...args: unknown[]): Promise<T> {
  const { Call } = await import('@wailsio/runtime')
  return Call.ByName('main.DoctorService.' + method, ...args) as Promise<T>
}

async function nativeFileCall<T>(method: string, ...args: unknown[]): Promise<T> {
  if (!(await nativeCall<boolean>('SetLanguage', savedLanguage()))) {
    throw new Error('Could not apply the dialog language')
  }
  return nativeCall<T>(method, ...args)
}

export interface ServerCheck {
  status:
    | 'ok'
    | 'denied'
    | 'missing'
    | 'unavailable'
    | 'invalid_file'
    | 'changed'
    | 'too_large'
    | 'busy'
    | 'timeout'
  sha256?: string
}

export function validateServerShare(path: string) {
  return nativeCall<string>('ValidateServerShare', path)
}

export function validateServerFile(path: string) {
  return nativeCall<string>('ValidateServerFile', path)
}

export function testServerShare(path: string) {
  return nativeCall<ServerCheck>('TestServerShare', path)
}

export function inspectServerFile(share: string, file: string) {
  return nativeCall<ServerCheck>('InspectServerFile', share, file)
}

export interface UpdateInfo {
  currentVersion: string
  version: string
  file: string
}

export function checkForUpdate(): Promise<UpdateInfo> {
  return nativeCall<UpdateInfo>('CheckForUpdate')
}

export function openUpdateDownload(version: string): Promise<void> {
  return nativeCall<void>('OpenUpdateDownload', version)
}

export async function loadWorkspace(): Promise<Workspace> {
  if (isDesktop()) return validateWorkspace(await nativeCall('GetWorkspace'))
  return validateWorkspace(structuredClone(demoFixture))
}

export async function parseSnapshot(raw: string): Promise<Workspace> {
  // Check bytes, not UTF-16 length, before parsing or sending over the bridge.
  if (raw.length === 0 || byteLength(raw) > MAX_SNAPSHOT_BYTES) {
    throw new Error('스냅샷 크기 또는 문자 인코딩을 확인하세요')
  }
  if (isDesktop()) return validateWorkspace(await nativeCall('ParseSnapshot', raw))
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Never echo untrusted JSON, paths, field values or possible credentials.
    throw new Error('지원하는 스냅샷 JSON 형식과 필드만 가져올 수 있습니다')
  }
  return validateWorkspace(parsed)
}

export async function openWorkspace(): Promise<Workspace | null> {
  if (!isDesktop()) return null
  const result = await nativeFileCall<unknown>('OpenWorkspace')
  return result == null ? null : validateWorkspace(result)
}

export async function compareContexts(
  left: ExecutionContext,
  right: ExecutionContext,
): Promise<ComparisonResult> {
  if (isDesktop()) return nativeCall('Compare', left, right)
  return compareBrowser(left, right)
}

export async function exportWorkspace(workspace: Workspace): Promise<boolean> {
  const safe = validateWorkspace(workspace)
  if (isDesktop()) return nativeFileCall('ExportWorkspace', safe)
  // A saved snapshot must fit the same byte limit when reopened. Pretty
  // printing can push a valid near-limit snapshot over the import limit.
  const serialized = JSON.stringify(safe)
  if (byteLength(serialized) > MAX_SNAPSHOT_BYTES) {
    throw new Error('스냅샷 크기 또는 문자 인코딩을 확인하세요')
  }
  const blob = new Blob([serialized], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'winscript-doctor-' + safe.host.name.replace(/[^a-zA-Z0-9._-]/g, '_') + '.json'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Leave the URL alive until the browser has consumed the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return true
}

type RecordValue = Record<string, unknown>
const FORMAT_ERROR = '지원하는 스냅샷 JSON 형식과 필드만 가져올 수 있습니다'

function object(value: unknown, keys: string[]): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(FORMAT_ERROR)
  }
  const result = value as RecordValue
  const allowed = new Set(keys)
  if (Object.keys(result).some((key) => !allowed.has(key))) {
    throw new Error(FORMAT_ERROR)
  }
  return result
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function text(value: unknown, maxBytes: number, required = false): string {
  // Go's JSON decoder maps null or absent optional string fields to "".
  if (value == null && !required) return ''
  if (
    typeof value !== 'string' ||
    byteLength(value) > maxBytes ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value) ||
    (required && value.trim() === '')
  ) {
    throw new Error(FORMAT_ERROR)
  }
  return value
}

function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) {
    throw new Error(FORMAT_ERROR)
  }
  return value as T
}

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    throw new Error(FORMAT_ERROR)
  return value
}

function collection(value: unknown): Collection | undefined {
  if (value == null) return undefined
  const source = object(value, [
    'root',
    'startedAt',
    'completedAt',
    'status',
    'taskStatus',
    'examinedTasks',
    'issues',
  ])
  const seen = new Set<string>()
  const result: Collection = {
    root: text(source.root, 4096, true),
    startedAt: timestamp(source.startedAt),
    completedAt: timestamp(source.completedAt),
    status: choice(source.status, ['complete', 'partial', 'cancelled']),
    taskStatus: choice(source.taskStatus, ['complete', 'partial', 'unavailable', 'not_applicable']),
    examinedTasks: integer(source.examinedTasks, 0, 5000),
    issues: list(source.issues, 15).map((item) => {
      const issue = object(item, ['code', 'count'])
      const code = choice(
        issue.code,
        Object.keys(collectionIssueLabels) as (keyof typeof collectionIssueLabels)[],
      )
      if (seen.has(code)) throw new Error(FORMAT_ERROR)
      seen.add(code)
      return { code, count: integer(issue.count, 1, 100000) }
    }),
  }
  if (
    Date.parse(result.completedAt) < Date.parse(result.startedAt) ||
    (result.taskStatus === 'not_applicable' && result.examinedTasks !== 0) ||
    (result.status === 'complete' &&
      (result.taskStatus === 'partial' ||
        result.taskStatus === 'unavailable' ||
        result.issues.length > 0))
  )
    throw new Error(FORMAT_ERROR)
  return result
}

function taskLinks(value: unknown): TaskLink[] | undefined {
  if (value == null) return undefined
  const seen = new Set<string>()
  return list(value, 8).map((item) => {
    const link = object(item, [
      'name',
      'action',
      'executable',
      'workingDirectory',
      'account',
      'logonType',
      'lastRunTime',
      'lastResult',
    ])
    const name = text(link.name, 512, true)
    const action = integer(link.action, 1, 32)
    const id = name + '\0' + action
    if (seen.has(id)) throw new Error(FORMAT_ERROR)
    seen.add(id)
    const lastRunTime =
      link.lastRunTime == null || link.lastRunTime === '' ? '' : timestamp(link.lastRunTime)
    const lastResult = text(link.lastResult, 10)
    if (lastResult && !/^0x[0-9A-F]{8}$/u.test(lastResult)) throw new Error(FORMAT_ERROR)
    return {
      name,
      action,
      executable: text(link.executable, 4096, true),
      workingDirectory: text(link.workingDirectory, 4096),
      account: text(link.account, 512),
      logonType: text(link.logonType, 64),
      lastRunTime,
      lastResult,
    }
  })
}

function list(value: unknown, maximum: number): unknown[] {
  // Empty collections are valid snapshots. Normalize Go nil slices for the UI.
  if (value == null) return []
  if (!Array.isArray(value) || value.length > maximum) throw new Error(FORMAT_ERROR)
  return value
}

function timestamp(value: unknown): string {
  const result = text(value, 128, true)
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.exec(result)
  if (!parts) throw new Error(FORMAT_ERROR)
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1] ||
    Number(parts[4]) > 23 ||
    Number(parts[5]) > 59 ||
    Number(parts[6]) > 59 ||
    !Number.isFinite(Date.parse(result))
  ) {
    throw new Error(FORMAT_ERROR)
  }
  return result
}

function context(value: unknown): ExecutionContext {
  const source = object(value, [
    'label',
    'captureMethod',
    'capturedAt',
    'account',
    'logonType',
    'engine',
    'version',
    'architecture',
    'workingDirectory',
    'modulePaths',
    'networkAccess',
  ])
  return {
    label: text(source.label, 256, true),
    captureMethod: text(source.captureMethod, 256, true),
    capturedAt: timestamp(source.capturedAt),
    account: text(source.account, 4096),
    logonType: text(source.logonType, 4096),
    engine: text(source.engine, 4096),
    version: text(source.version, 4096),
    architecture: text(source.architecture, 4096),
    workingDirectory: text(source.workingDirectory, 4096),
    modulePaths: list(source.modulePaths, 200).map((path) => text(path, 4096)),
    networkAccess: text(source.networkAccess, 4096),
  }
}

function validateWorkspace(value: unknown): Workspace {
  const source = object(value, [
    'schemaVersion',
    'id',
    'demo',
    'host',
    'scripts',
    'findings',
    'comparisons',
    'collection',
  ])
  if (source.schemaVersion !== 1 && source.schemaVersion !== 2)
    throw new Error('지원하지 않는 스냅샷 버전입니다')
  if (source.demo != null && typeof source.demo !== 'boolean') throw new Error(FORMAT_ERROR)
  const host = object(source.host, ['name', 'os', 'account', 'permission', 'collectedAt'])
  const scripts = list(source.scripts, 10_000).map((item): Script => {
    const script = object(item, [
      'id',
      'name',
      'path',
      'engine',
      'taskName',
      'status',
      'lastRun',
      'description',
      'sha256',
      'taskLinks',
    ])
    const sha256 = text(script.sha256, 64)
    if (sha256 && !/^[a-f0-9]{64}$/u.test(sha256)) throw new Error(FORMAT_ERROR)
    const links = taskLinks(script.taskLinks)
    if (links?.length && script.taskName !== links[0].name) throw new Error(FORMAT_ERROR)
    return {
      id: text(script.id, 128, true),
      name: text(script.name, 512, true),
      path: text(script.path, 4096, true),
      engine: choice(script.engine, ['PowerShell', 'Batch', 'Shell']),
      taskName: text(script.taskName, 512),
      status: choice(script.status, ['attention', 'healthy', 'unknown']),
      lastRun: text(script.lastRun, 128),
      description: text(script.description, 8192),
      ...(sha256 ? { sha256 } : {}),
      ...(links ? { taskLinks: links } : {}),
    }
  })
  const scriptIDs = uniqueIDs(scripts)
  const scriptStatuses = new Map(scripts.map((script) => [script.id, script.status]))
  const scriptTasks = new Map<string, number>()
  for (const script of scripts) {
    const target = script.name + '\0' + script.taskName
    scriptTasks.set(target, (scriptTasks.get(target) ?? 0) + 1)
  }
  const findings = list(source.findings, 20_000).map((item): Finding => {
    const finding = object(item, [
      'id',
      'ruleId',
      'title',
      'explanation',
      'scriptId',
      'severity',
      'evidenceState',
      'nextStep',
      'evidence',
    ])
    const scriptId = text(finding.scriptId, 128, true)
    if (!scriptIDs.has(scriptId)) throw new Error('진단의 필수 정보, 참조 또는 상태를 확인하세요')
    const severity = choice(finding.severity, ['warning', 'danger', 'info'])
    const evidenceState = choice(finding.evidenceState, ['candidate', 'observed', 'unknown'])
    if (
      scriptStatuses.get(scriptId) === 'healthy' &&
      (severity !== 'info' || evidenceState !== 'observed')
    ) {
      throw new Error('스크립트 상태와 연결된 진단 결과가 일치하지 않습니다')
    }
    return {
      id: text(finding.id, 128, true),
      ruleId: text(finding.ruleId, 128, true),
      title: text(finding.title, 1024, true),
      explanation: text(finding.explanation, 8192, true),
      scriptId,
      severity,
      evidenceState,
      nextStep: text(finding.nextStep, 8192, true),
      evidence: list(finding.evidence, 100).map((entry) => text(entry, 8192)),
    }
  })
  uniqueIDs(findings)
  const comparisons = list(source.comparisons, 10_000).map((item): ContextPair => {
    const pair = object(item, ['id', 'taskName', 'scriptName', 'manual', 'scheduled'])
    const taskName = text(pair.taskName, 512, true)
    const scriptName = text(pair.scriptName, 512, true)
    if (scriptTasks.get(scriptName + '\0' + taskName) !== 1) {
      throw new Error('환경 비교의 필수 정보 또는 스크립트 참조를 확인하세요')
    }
    return {
      id: text(pair.id, 128, true),
      taskName,
      scriptName,
      manual: context(pair.manual),
      scheduled: context(pair.scheduled),
    }
  })
  uniqueIDs(comparisons)
  const scope = collection(source.collection)
  if (
    source.schemaVersion === 1 &&
    (scope || scripts.some((script) => script.sha256 || script.taskLinks?.length))
  )
    throw new Error('수집 메타데이터에는 스냅샷 버전 2가 필요합니다')
  return {
    schemaVersion: source.schemaVersion,
    id: text(source.id, 128, true),
    demo: source.demo === true,
    host: {
      name: text(host.name, 256, true),
      os: text(host.os, 256, true),
      account: text(host.account, 512, true),
      permission: choice(host.permission, ['standard', 'elevated', 'unknown']),
      collectedAt: timestamp(host.collectedAt),
    },
    scripts,
    findings,
    comparisons,
    ...(scope ? { collection: scope } : {}),
  }
}

function uniqueIDs(items: { id: string }[]): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) throw new Error('스냅샷의 항목 식별자가 중복되었습니다')
    ids.add(item.id)
  }
  return ids
}

const unknownValues = new Set([
  '',
  '미확인',
  '확인 불가',
  '수집되지 않음',
  'unknown',
  'not_collected',
  'unavailable',
  'not available',
  'n/a',
])

function isUnknown(value: string): boolean {
  return unknownValues.has(value.trim().toLowerCase())
}

function fold(value: string): string {
  return value.trim().toLowerCase()
}

function pathKey(value: string): string {
  let path = value.trim()
  if (!path.startsWith('\\\\?\\')) {
    path = path.replaceAll('/', '\\')
    if (!/^[a-zA-Z]:\\$/u.test(path)) path = path.replace(/\\+$/u, '')
  }
  return path.toLowerCase()
}

function compareBrowser(left: ExecutionContext, right: ExecutionContext): ComparisonResult {
  const rows: ComparisonRow[] = []
  const add = (key: string, label: string, a: string, b: string, equal: boolean, note: string) => {
    let status: ComparisonRow['status'] = 'changed'
    if (isUnknown(a) || isUnknown(b)) {
      status = 'unknown'
      note = '한쪽 이상의 값이 미확인입니다. 같은 실행 계정과 조건에서 추가 수집이 필요합니다.'
    } else if (equal) {
      status = 'same'
      note = '수집한 값이 일치합니다. 이 항목만으로 업무 실행의 성공을 보장하지 않습니다.'
    }
    rows.push({
      key,
      label,
      left: isUnknown(a) ? '미확인' : a,
      right: isUnknown(b) ? '미확인' : b,
      status,
      note,
    })
  }
  add(
    'account',
    '실행 계정',
    left.account,
    right.account,
    fold(left.account) === fold(right.account),
    '실행 계정의 차이를 관측했습니다. 대상 계정의 실제 접근 권한은 별도로 확인하세요.',
  )
  add(
    'logonType',
    '로그온 방식',
    left.logonType,
    right.logonType,
    fold(left.logonType) === fold(right.logonType),
    '로그온 방식의 차이를 관측했습니다. 해당 방식의 네트워크 접근 조건을 확인하세요.',
  )
  add(
    'engine',
    '실행 엔진',
    left.engine,
    right.engine,
    pathKey(left.engine) === pathKey(right.engine),
    '실행 파일의 차이를 관측했습니다. 버전과 호환성을 함께 확인하세요.',
  )
  add(
    'version',
    '엔진 버전',
    left.version,
    right.version,
    left.version.trim() === right.version.trim(),
    '실행 엔진의 버전이 다릅니다. 스크립트와 모듈의 지원 버전을 확인하세요.',
  )
  add(
    'architecture',
    '프로세스 비트 수',
    left.architecture,
    right.architecture,
    fold(left.architecture) === fold(right.architecture),
    '프로세스 비트 수의 차이를 관측했습니다. 사용하는 모듈과 외부 프로그램을 확인하세요.',
  )
  add(
    'workingDirectory',
    '작업 폴더',
    left.workingDirectory,
    right.workingDirectory,
    pathKey(left.workingDirectory) === pathKey(right.workingDirectory),
    '작업 폴더가 다릅니다. 상대 경로 사용 여부를 확인하세요. 차이만으로 장애 원인을 확정하지 않습니다.',
  )
  const pathsEqual =
    left.modulePaths.length === right.modulePaths.length &&
    left.modulePaths.every((path, index) => pathKey(path) === pathKey(right.modulePaths[index]))
  add(
    'modulePaths',
    '모듈 검색 경로',
    left.modulePaths.join('\n'),
    right.modulePaths.join('\n'),
    pathsEqual,
    '모듈 검색 경로나 우선순위가 다릅니다. 모듈 설치와 Import 성공 여부는 별도 확인이 필요합니다.',
  )
  add(
    'networkAccess',
    '네트워크 자원 접근',
    left.networkAccess,
    right.networkAccess,
    fold(left.networkAccess) === fold(right.networkAccess),
    '수집된 접근 결과가 다릅니다. 동일한 대상 자원과 계정으로 수집했는지 확인하세요.',
  )
  return {
    rows,
    changeCount: rows.filter((row) => row.status === 'changed').length,
    unknownCount: rows.filter((row) => row.status === 'unknown').length,
  }
}
