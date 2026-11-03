import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  FileCode2,
  FileJson,
  FolderOpen,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Monitor,
  Moon,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Terminal,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  compareContexts,
  exportWorkspace,
  isDesktop,
  loadWorkspace,
  openWorkspace,
  parseSnapshot,
  type ComparisonResult,
  type ContextPair,
  type Finding,
  type Script,
  type Workspace,
} from '@/lib/doctor'

type Page = 'overview' | 'compare'
type Filter = 'all' | 'attention' | 'PowerShell' | 'Batch'
type RowFilter = 'all' | 'changed' | 'unknown'

const scriptStatus = {
  attention: { label: '확인 필요', className: 'status-warning' },
  healthy: { label: '특이사항 없음', className: 'status-success' },
  unknown: { label: '미확인', className: 'status-info' },
}
const evidenceLabels = { candidate: '원인 후보', observed: '직접 관측', unknown: '미확인' }

function shortTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date)
}

function Status({ status }: { status: Script['status'] }) {
  const style = scriptStatus[status]
  return (
    <Badge variant="outline" className={cn('status-badge', style.className)}>
      <span className="status-dot" />
      {style.label}
    </Badge>
  )
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <Search size={26} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [selectedScript, setSelectedScript] = useState('')
  const [selectedPair, setSelectedPair] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('wsd-theme') === 'dark')

  function applyWorkspace(next: Workspace) {
    setWorkspace(next)
    setSelectedScript(next.scripts[0]?.id ?? '')
    setSelectedPair(next.comparisons[0]?.id ?? '')
    setError('')
  }

  useEffect(() => {
    let active = true
    loadWorkspace()
      .then((next) => {
        if (active) applyWorkspace(next)
      })
      .catch(() => {
        if (active)
          setError('점검 결과를 열지 못했습니다. 앱을 다시 실행하거나 다른 스냅샷을 가져오세요.')
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('wsd-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const content = document.querySelector('.main-scroll')
    if (content) content.scrollTop = 0
  }, [page, workspace?.id])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 5500)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function handleImport() {
    if (!isDesktop()) {
      setImportOpen(true)
      return
    }
    setBusy(true)
    try {
      const next = await openWorkspace()
      if (next) {
        applyWorkspace(next)
        setNotice('스냅샷을 가져왔습니다.')
      }
    } catch {
      setError('스냅샷을 열지 못했습니다. 지원 형식과 파일 크기를 확인하세요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleExport() {
    if (!workspace) return
    setBusy(true)
    try {
      if (await exportWorkspace(workspace))
        setNotice('스냅샷을 저장했습니다. 호스트명과 계정이 포함된 내부용 파일입니다.')
    } catch {
      setError('파일을 저장하지 못했습니다. 저장 위치와 쓰기 권한을 확인하세요.')
    } finally {
      setBusy(false)
    }
  }

  async function resetDemo() {
    setBusy(true)
    try {
      applyWorkspace(await loadWorkspace())
      setNotice('합성 예제를 불러왔습니다.')
    } catch {
      setError('예제를 불러오지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function goToComparison(script?: Script) {
    const pair = workspace?.comparisons.find(
      (item) => item.taskName === script?.taskName && item.scriptName === script?.name,
    )
    if (pair) setSelectedPair(pair.id)
    setPage('compare')
  }

  const title = page === 'overview' ? '점검 개요' : '환경 비교'

  return (
    <TooltipProvider delayDuration={250}>
      <div className="app-shell">
        <aside className="sidebar" aria-label="주 메뉴">
          <button
            className="brand"
            onClick={() => setPage('overview')}
            aria-label="WinScript Doctor 홈"
          >
            <span className="brand-mark">
              <Terminal size={23} strokeWidth={2} />
            </span>
            <span>
              <strong>WinScript</strong>
              <small>DOCTOR</small>
            </span>
            <span className="version-mark">0.1</span>
          </button>
          <div className="sidebar-section-label">작업공간</div>
          <nav className="nav-list">
            <button
              className={cn('nav-item', page === 'overview' && 'active')}
              onClick={() => setPage('overview')}
              aria-current={page === 'overview' ? 'page' : undefined}
            >
              <LayoutDashboard size={18} />
              점검 개요
            </button>
            <button
              className={cn('nav-item', page === 'compare' && 'active')}
              onClick={() => setPage('compare')}
              aria-current={page === 'compare' ? 'page' : undefined}
            >
              <ArrowLeftRight size={18} />
              환경 비교
              {workspace && <span className="nav-count">{workspace.comparisons.length}</span>}
            </button>
          </nav>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">현재 스냅샷</div>
          <div className="host-card">
            <span className="host-icon">
              <Server size={18} />
            </span>
            <div>
              <strong>{workspace?.host.name ?? '스냅샷 없음'}</strong>
              <small>{workspace?.host.os ?? '결과를 가져오세요'}</small>
            </div>
          </div>
          <button className="sidebar-link" onClick={resetDemo} disabled={busy}>
            <FileJson size={15} />
            예제 불러오기
            <ChevronRight size={14} />
          </button>
          <div className="sidebar-bottom">
            <ShieldCheck size={18} />
            <strong>로컬 데이터 처리</strong>
            <p>결과를 외부로 전송하지 않습니다.</p>
            <span>Windows 스크립트 진단</span>
          </div>
        </aside>

        <div className="workspace-shell">
          <header className="topbar">
            <div className="breadcrumb">
              작업공간
              <ChevronRight size={13} />
              <span>{title}</span>
            </div>
            <div className="topbar-actions">
              <span className="local-indicator">
                <span />
                로컬 작업공간
              </span>
              <div className="topbar-divider" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="icon-button"
                    onClick={() => setDark(!dark)}
                    aria-label={dark ? '밝은 테마로 전환' : '어두운 테마로 전환'}
                  >
                    {dark ? <Sun size={17} /> : <Moon size={17} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>테마 전환</TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="icon-button"
                aria-label="도움말"
                onClick={() => setHelpOpen(true)}
              >
                <CircleHelp size={18} />
              </Button>
            </div>
          </header>

          <main className="main-scroll" id="main-content">
            <div className="main-inner">
              {error && (
                <div className="error-banner" role="alert">
                  <CircleAlert size={18} />
                  <span>{error}</span>
                  <button aria-label="오류 닫기" onClick={() => setError('')}>
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {page === 'overview' ? '스크립트 상태 점검' : '실행 환경 비교'}
                  </div>
                  <h1>{page === 'overview' ? '운영 스크립트 점검' : '실행 환경 비교'}</h1>
                  <p>
                    {page === 'overview'
                      ? '스크립트와 예약 작업의 실행 조건을 함께 확인하세요.'
                      : '수동 기준과 예약 실행에서 무엇이 달라졌는지 확인하세요.'}
                  </p>
                </div>
                <div className="page-actions">
                  <Button variant="outline" onClick={handleExport} disabled={!workspace || busy}>
                    <ArrowDownToLine size={16} />
                    결과 저장
                  </Button>
                  <Button onClick={handleImport} disabled={busy}>
                    <FolderOpen size={16} />
                    스냅샷 열기
                  </Button>
                </div>
              </div>

              {workspace && (
                <div className="snapshot-bar">
                  <span className="snapshot-host">
                    <Monitor size={15} />
                    {workspace.host.name}
                  </span>
                  <span className="meta-divider" />
                  <span>{workspace.host.os}</span>
                  <span className="snapshot-time">
                    <Clock3 size={14} />
                    {shortTime(workspace.host.collectedAt)} 수집
                  </span>
                  <Badge
                    variant="outline"
                    className={workspace.demo ? 'demo-badge' : 'source-badge'}
                  >
                    {workspace.demo ? '합성 예제' : '가져온 스냅샷'}
                  </Badge>
                </div>
              )}

              {busy && !workspace ? (
                <div className="loading-state" role="status">
                  <LoaderCircle className="animate-spin" size={25} />
                  <p>점검 결과를 불러오고 있습니다</p>
                </div>
              ) : workspace ? (
                page === 'overview' ? (
                  <Overview
                    key={workspace.id}
                    workspace={workspace}
                    selectedId={selectedScript}
                    onSelect={setSelectedScript}
                    onCompare={goToComparison}
                  />
                ) : (
                  <EnvironmentComparison
                    workspace={workspace}
                    pairId={selectedPair}
                    onSelectPair={setSelectedPair}
                  />
                )
              ) : (
                <Empty
                  title="스냅샷을 열어 시작하세요"
                  description="저장된 JSON 파일을 가져오거나 합성 예제를 불러올 수 있습니다."
                />
              )}
            </div>
          </main>
          <footer className="statusbar">
            <span>
              <ShieldCheck size={12} />
              {isDesktop() ? 'Wails 데스크톱' : '브라우저 미리보기'}
            </span>
            <span>
              {workspace?.demo
                ? '예제 데이터 · 실제 서버를 점검한 결과가 아닙니다'
                : '저장된 스냅샷 기반 · 실시간 상태가 아닙니다'}
            </span>
            <span>
              WinScript Doctor <span className="mono">v0.1.0</span>
            </span>
          </footer>
        </div>
      </div>
      {notice && (
        <div className="notice" role="status">
          <CheckCheck size={18} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="알림 닫기">
            <X size={15} />
          </button>
        </div>
      )}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(next) => {
          applyWorkspace(next)
          setImportOpen(false)
          setNotice('스냅샷을 가져왔습니다.')
        }}
      />
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>점검 결과를 읽는 방법</DialogTitle>
            <DialogDescription>관측한 차이와 장애 원인 후보를 구분합니다.</DialogDescription>
          </DialogHeader>
          <div className="help-content">
            <p>
              <strong>직접 관측</strong>수집된 두 값 사이에 실제 차이가 있습니다.
            </p>
            <p>
              <strong>원인 후보</strong>관측한 차이가 실패와 관련 있는지 추가 확인이 필요합니다.
            </p>
            <p>
              <strong>미확인</strong>정보가 수집되지 않았거나 대상 계정에서 검증하지 않았습니다.
            </p>
            <div className="inline-info">
              <Info size={17} />
              <span>
                이 버전은 저장된 결과를 탐색하고 비교합니다. 운영 스크립트 실행과 자동 수정은
                수행하지 않습니다.
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

function Overview({
  workspace,
  selectedId,
  onSelect,
  onCompare,
}: {
  workspace: Workspace
  selectedId: string
  onSelect: (id: string) => void
  onCompare: (script?: Script) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const scripts = useMemo(
    () =>
      workspace.scripts.filter((script) => {
        const matchesQuery = `${script.name} ${script.taskName} ${script.path}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())
        return (
          matchesQuery &&
          (filter === 'all' ||
            (filter === 'attention' && script.status !== 'healthy') ||
            script.engine === filter)
        )
      }),
    [workspace, query, filter],
  )
  useEffect(() => {
    if (!scripts.some((item) => item.id === selectedId)) onSelect(scripts[0]?.id ?? '')
  }, [scripts, selectedId, onSelect])
  const selected = scripts.find((item) => item.id === selectedId)
  const findings = workspace.findings.filter((item) => item.scriptId === selectedId)
  const attentionCount = workspace.scripts.filter((item) => item.status !== 'healthy').length

  return (
    <>
      <div className="summary-grid">
        <Summary
          label="점검 대상 스크립트"
          value={workspace.scripts.length}
          unit="개"
          icon={<FileCode2 size={20} />}
          detail={`${workspace.scripts.filter((item) => item.engine === 'PowerShell').length} PowerShell · ${workspace.scripts.filter((item) => item.engine === 'Batch').length} BAT / CMD`}
        />
        <Summary
          label="확인이 필요한 스크립트"
          value={attentionCount}
          unit="개"
          icon={<TriangleAlert size={20} />}
          detail="원인 후보와 미확인 항목 포함"
          tone="warning"
        />
        <Summary
          label="수집된 환경 비교"
          value={workspace.comparisons.length}
          unit="쌍"
          icon={<ArrowLeftRight size={20} />}
          detail="수동 기준과 예약 실행의 비교 자료"
        />
      </div>

      <div className="overview-grid">
        <section className="panel inventory-panel" aria-label="스크립트 목록">
          <div className="panel-heading">
            <div>
              <h2>
                스크립트 목록 <span>{workspace.scripts.length}</span>
              </h2>
              <p>파일과 연결된 예약 작업을 확인하세요.</p>
            </div>
            <FileCode2 size={19} className="muted-icon" />
          </div>
          <div className="inventory-toolbar">
            <div className="search-field">
              <Search size={16} />
              <Input
                aria-label="스크립트 검색"
                placeholder="스크립트, 작업 이름으로 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button aria-label="검색 초기화" onClick={() => setQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="filter-icon">
                  <SlidersHorizontal size={16} />
                </span>
              </TooltipTrigger>
              <TooltipContent>아래 필터로 목록을 좁힐 수 있습니다.</TooltipContent>
            </Tooltip>
          </div>
          <div className="filter-list" aria-label="스크립트 필터">
            {(
              [
                { id: 'all', label: '전체' },
                { id: 'attention', label: '확인 필요' },
                { id: 'PowerShell', label: 'PowerShell' },
                { id: 'Batch', label: 'BAT / CMD' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                className={cn('filter-chip', filter === item.id && 'selected')}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {item.id === 'all' && <span>{workspace.scripts.length}</span>}
              </button>
            ))}
          </div>
          <div className="table-scroll">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>스크립트</th>
                  <th>예약 작업</th>
                  <th>상태</th>
                  <th className="last-run">최근 실행</th>
                </tr>
              </thead>
              <tbody>
                {scripts.map((script) => (
                  <tr
                    key={script.id}
                    className={cn(selectedId === script.id && 'selected-row')}
                    onClick={() => onSelect(script.id)}
                  >
                    <td>
                      <button
                        className="script-cell"
                        onClick={() => onSelect(script.id)}
                        aria-pressed={selectedId === script.id}
                      >
                        <span
                          className={cn('script-icon', script.engine === 'Batch' && 'batch-icon')}
                        >
                          <Terminal size={16} />
                        </span>
                        <span>
                          <strong>{script.name}</strong>
                          <small>{script.engine === 'Batch' ? 'BAT / CMD' : 'PowerShell'}</small>
                        </span>
                      </button>
                    </td>
                    <td className="task-cell" title={script.taskName}>
                      {script.taskName || '연결 미확인'}
                    </td>
                    <td>
                      <Status status={script.status} />
                    </td>
                    <td className="last-run time-cell">{shortTime(script.lastRun)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scripts.length === 0 && (
              <Empty
                title="검색 결과가 없습니다"
                description="다른 검색어나 필터로 다시 확인하세요."
              />
            )}
          </div>
          <div className="table-footer">
            <span>
              {scripts.length}개 표시{' '}
              <span className="subtle-text">/ 전체 {workspace.scripts.length}개</span>
            </span>
            <span>
              <Info size={13} />
              행을 선택하면 진단 근거를 볼 수 있습니다
            </span>
          </div>
        </section>

        <aside className="panel detail-panel" aria-label="선택한 스크립트 진단">
          <div className="detail-heading">
            <span className="small-label">진단 근거</span>
            <h2>진단 상세</h2>
          </div>
          {selected ? (
            <>
              <div className="selected-script">
                <FileCode2 size={18} />
                <div>
                  <strong>{selected.name}</strong>
                  <span className="mono">{selected.taskName}</span>
                </div>
              </div>
              <p className="script-description">{selected.description}</p>
              <div className="path-label">파일 위치</div>
              <div className="path-value mono">{selected.path}</div>
              <div className="detail-separator" />
              <div className="findings-title">
                확인할 진단 <span>{findings.length}</span>
              </div>
              {findings.length ? (
                findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)
              ) : (
                <div className="no-finding">
                  <ShieldCheck size={22} />
                  <strong>등록된 진단 항목이 없습니다</strong>
                  <p>현재 스냅샷에 기록된 결과입니다.</p>
                </div>
              )}
              {workspace.comparisons.some(
                (item) => item.taskName === selected.taskName && item.scriptName === selected.name,
              ) && (
                <Button className="compare-action" onClick={() => onCompare(selected)}>
                  <ArrowLeftRight size={15} />이 작업의 환경 비교
                  <ArrowRight size={15} />
                </Button>
              )}
            </>
          ) : (
            <Empty
              title="스크립트를 선택하세요"
              description="목록에서 항목을 선택하면 근거가 표시됩니다."
            />
          )}
        </aside>
      </div>
      <div className="scope-note">
        <ShieldCheck size={16} />
        <span>
          관측한 차이는 원인을 좁히는 단서입니다. 실제 실행 계정에서 확인하지 못한 항목은 미확인으로
          남깁니다.
        </span>
      </div>
    </>
  )
}

function Summary({
  label,
  value,
  unit,
  icon,
  detail,
  tone,
}: {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  detail: string
  tone?: string
}) {
  return (
    <div className={cn('summary-card', tone === 'warning' && 'summary-warning')}>
      <div className="summary-top">
        <span>{label}</span>
        <span className="summary-icon">{icon}</span>
      </div>
      <div className="summary-number">
        {value}
        <small>{unit}</small>
      </div>
      <p>{detail}</p>
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={cn('finding-card', `finding-${finding.severity}`)}>
      <button
        className="finding-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {finding.severity === 'danger' ? (
          <CircleAlert size={16} />
        ) : finding.severity === 'warning' ? (
          <TriangleAlert size={16} />
        ) : (
          <Info size={16} />
        )}
        <span>{finding.title}</span>
        <ChevronDown size={14} className={expanded ? 'rotate-180' : ''} />
      </button>
      <div className="finding-meta">
        <span className="mono">{finding.ruleId}</span>
        <Badge
          variant="outline"
          className={cn('evidence-badge', finding.evidenceState === 'unknown' && 'status-info')}
        >
          {evidenceLabels[finding.evidenceState]}
        </Badge>
      </div>
      <p>{finding.explanation}</p>
      {expanded && (
        <div className="finding-evidence">
          <strong>확인 근거</strong>
          <ul>
            {finding.evidence.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <strong>다음 확인</strong>
          <p>{finding.nextStep}</p>
        </div>
      )}
    </div>
  )
}

function EnvironmentComparison({
  workspace,
  pairId,
  onSelectPair,
}: {
  workspace: Workspace
  pairId: string
  onSelectPair: (id: string) => void
}) {
  const pair = workspace.comparisons.find((item) => item.id === pairId)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [swapped, setSwapped] = useState(false)
  const [filter, setFilter] = useState<RowFilter>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeKey, setActiveKey] = useState('workingDirectory')
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    setSwapped(false)
    setFilter('all')
    setActiveKey('workingDirectory')
  }, [pairId])
  useEffect(() => {
    let active = true
    setResult(null)
    if (!pair) return
    setLoading(true)
    setError(false)
    compareContexts(swapped ? pair.scheduled : pair.manual, swapped ? pair.manual : pair.scheduled)
      .then((next) => {
        if (active) setResult(next)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [pair, swapped])

  if (!pair)
    return (
      <Empty
        title="비교할 환경 정보가 없습니다"
        description="수동 기준과 예약 실행 정보가 포함된 스냅샷을 가져오세요."
      />
    )
  const left = swapped ? pair.scheduled : pair.manual
  const right = swapped ? pair.manual : pair.scheduled
  const rows = result?.rows.filter((item) => filter === 'all' || item.status === filter) ?? []
  const activeRow = rows.find((item) => item.key === activeKey) ?? rows[0]

  return (
    <>
      <div className="comparison-toolbar">
        <div className="comparison-selector">
          <label htmlFor="task-select">비교할 작업</label>
          <div className="select-wrapper">
            <Terminal size={16} />
            <select
              id="task-select"
              value={pairId}
              onChange={(event) => onSelectPair(event.target.value)}
            >
              {workspace.comparisons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.taskName}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </div>
          <span className="comparison-file mono">{pair.scriptName}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSwapped(!swapped)}>
          <ArrowLeftRight size={14} />
          좌우 바꾸기
        </Button>
      </div>
      <div className="context-grid">
        <ContextCard context={left} variant={swapped ? 'scheduled' : 'manual'} />
        <ContextCard context={right} variant={swapped ? 'manual' : 'scheduled'} />
      </div>
      <section className="panel comparison-panel" aria-label="실행 환경 비교 결과">
        <div className="comparison-heading">
          <div>
            <h2>실행 환경 비교</h2>
            <p>값이 다른 항목과 아직 확인하지 못한 항목을 구분합니다.</p>
          </div>
          {result && (
            <div className="comparison-summary">
              <span className="status-warning">
                <ArrowLeftRight size={14} />
                차이 {result.changeCount}
              </span>
              <span className="status-info">
                <CircleHelp size={14} />
                미확인 {result.unknownCount}
              </span>
            </div>
          )}
        </div>
        <div className="comparison-filters" aria-label="환경 비교 필터">
          {(
            [
              { id: 'all', label: '전체 항목', count: result?.rows.length ?? 0 },
              { id: 'changed', label: '차이만', count: result?.changeCount ?? 0 },
              { id: 'unknown', label: '미확인', count: result?.unknownCount ?? 0 },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={cn(filter === item.id && 'selected')}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <div className="loading-state" role="status">
            <LoaderCircle className="animate-spin" size={23} />
            <p>실행 환경을 비교하고 있습니다</p>
          </div>
        ) : error ? (
          <div className="empty-state" role="alert">
            <CircleAlert size={24} />
            <h3>환경을 비교하지 못했습니다</h3>
            <p>스냅샷을 다시 가져오거나 다른 작업을 선택하세요.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>비교 항목</th>
                  <th>{left.label}</th>
                  <th>{right.label}</th>
                  <th>판정</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className={cn(
                      row.status === 'changed' && 'changed-row',
                      activeKey === row.key && 'active-comparison-row',
                    )}
                    onClick={() => setActiveKey(row.key)}
                  >
                    <th scope="row">
                      <button
                        onClick={() => setActiveKey(row.key)}
                        aria-pressed={activeKey === row.key}
                      >
                        {row.label}
                        <ChevronRight size={13} />
                      </button>
                    </th>
                    <td className="mono">{row.left || '미확인'}</td>
                    <td className="mono">{row.right || '미확인'}</td>
                    <td>
                      <Badge
                        variant="outline"
                        className={cn(
                          'comparison-badge',
                          row.status === 'changed'
                            ? 'status-warning'
                            : row.status === 'same'
                              ? 'status-success'
                              : 'status-info',
                        )}
                      >
                        {row.status === 'same' ? (
                          <Check size={12} />
                        ) : row.status === 'changed' ? (
                          <ArrowLeftRight size={12} />
                        ) : (
                          <CircleHelp size={12} />
                        )}
                        {row.status === 'changed'
                          ? '차이 있음'
                          : row.status === 'same'
                            ? '동일'
                            : '미확인'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <Empty
                title="해당하는 비교 항목이 없습니다"
                description="전체 항목에서 다른 값을 확인할 수 있습니다."
              />
            )}
          </div>
        )}
      </section>
      {activeRow && (
        <section className="comparison-insight">
          <span className="insight-icon">
            <Info size={20} />
          </span>
          <div>
            <div className="insight-title">
              <h3>{activeRow.label}</h3>
              <Badge variant="outline" className="evidence-badge">
                {activeRow.status === 'unknown' ? '미확인' : '직접 관측'}
              </Badge>
            </div>
            <p>{activeRow.note}</p>
            <button className="text-action" onClick={() => setDetailsOpen(true)}>
              수집 근거 자세히
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      )}
      <div className="scope-note">
        <ShieldCheck size={16} />
        <span>
          환경 차이만으로 장애 원인을 확정하지 않습니다. 미확인 항목은 차이 건수에 포함하지
          않습니다.
        </span>
      </div>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeRow?.label} 수집 근거</DialogTitle>
            <DialogDescription>두 환경의 수집 방식과 시각을 함께 확인하세요.</DialogDescription>
          </DialogHeader>
          <div className="evidence-context">
            <strong>{left.label}</strong>
            <span>{left.captureMethod}</span>
            <span>{shortTime(left.capturedAt)}</span>
            <strong>{right.label}</strong>
            <span>{right.captureMethod}</span>
            <span>{shortTime(right.capturedAt)}</span>
            <div className="inline-info">
              <Info size={17} />
              <span>{activeRow?.note}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ContextCard({
  context,
  variant,
}: {
  context: ContextPair['manual']
  variant: 'manual' | 'scheduled'
}) {
  return (
    <section className={cn('context-card', `context-${variant}`)}>
      <div className="context-card-top">
        <span className="context-symbol">
          {variant === 'manual' ? <Terminal size={18} /> : <Clock3 size={18} />}
        </span>
        <h2>{context.label}</h2>
        <Badge variant="outline" className="evidence-badge">
          수집됨
        </Badge>
      </div>
      <div className="context-account mono">{context.account || '실행 계정 미확인'}</div>
      <div className="context-card-bottom">
        <span>{context.captureMethod}</span>
        <span>{shortTime(context.capturedAt)}</span>
      </div>
    </section>
  )
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (workspace: Workspace) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Workspace | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const requestVersion = useRef(0)
  useEffect(() => {
    requestVersion.current += 1
    setBusy(false)
    if (open) {
      setPreview(null)
      setError('')
    }
    return () => {
      requestVersion.current += 1
    }
  }, [open])
  function changeOpen(next: boolean) {
    requestVersion.current += 1
    onOpenChange(next)
  }
  async function choose(file?: File) {
    if (!file) return
    const version = ++requestVersion.current
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error()
      const next = await parseSnapshot(await file.text())
      if (version === requestVersion.current) setPreview(next)
    } catch {
      if (version === requestVersion.current)
        setError('지원하는 스냅샷 JSON 파일인지 확인하세요. 최대 크기는 2 MiB입니다.')
    } finally {
      if (version === requestVersion.current) setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>스냅샷 열기</DialogTitle>
          <DialogDescription>
            WinScript Doctor의 JSON 스냅샷을 가져옵니다. 파일은 외부로 전송되지 않습니다.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="스냅샷 JSON 파일"
          onChange={(event) => {
            void choose(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button className="file-drop-zone" onClick={() => input.current?.click()} disabled={busy}>
          <span>
            {busy ? <LoaderCircle className="animate-spin" size={26} /> : <FileJson size={28} />}
          </span>
          <strong>{busy ? '파일을 확인하고 있습니다' : 'JSON 파일 선택'}</strong>
          <small>schemaVersion 1 · 최대 2 MiB</small>
        </button>
        {error && (
          <div className="import-error" role="alert">
            <CircleAlert size={16} />
            {error}
          </div>
        )}
        {preview && (
          <div className="import-preview">
            <Server size={19} />
            <div>
              <strong>{preview.host.name}</strong>
              <p>
                스크립트 {preview.scripts.length}개 · 환경 비교 {preview.comparisons.length}쌍
              </p>
            </div>
            <Check size={17} />
          </div>
        )}
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => changeOpen(false)}>
            취소
          </Button>
          <Button disabled={!preview || busy} onClick={() => preview && onImport(preview)}>
            가져오기
            <ArrowRight size={15} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
