import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  inspectServerFile,
  testServerShare,
  validateServerFile,
  validateServerShare,
  type ServerCheck,
} from '@/lib/doctor'

interface Profile {
  id: string
  alias: string
  path: string
}

interface Link {
  profile: string
  file: string
}

const profileKey = 'wsd-server-profiles-v1'
const maxProfiles = 40
const control = /[\p{Cc}\p{Cf}]/u

function readSetting(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw && raw.length <= 256_000 ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false
  const { id, alias, path } = value as Partial<Profile>
  return (
    typeof id === 'string' &&
    /^[a-f0-9-]{36}$/u.test(id) &&
    typeof alias === 'string' &&
    alias.length > 0 &&
    alias.length <= 80 &&
    !control.test(alias) &&
    typeof path === 'string' &&
    path.length <= 4096
  )
}

export function loadServerProfiles(): Profile[] {
  const saved = readSetting(profileKey)
  return Array.isArray(saved) ? saved.slice(0, maxProfiles).filter(isProfile) : []
}

function loadLink(key: string): Link | null {
  const saved = readSetting(key)
  if (!saved || typeof saved !== 'object') return null
  const { profile, file } = saved as Partial<Link>
  return typeof profile === 'string' && typeof file === 'string' && file.length <= 4096
    ? { profile, file }
    : null
}

function CheckResult({ result, file = false }: { result: ServerCheck; file?: boolean }) {
  const messages = {
    ok: file ? '파일 읽기 성공' : '연결 성공 · 공유 폴더 목록을 읽었습니다',
    denied: '접근 거부 · 현재 Windows 세션의 인증과 읽기 권한을 확인하세요',
    missing: '공유 폴더 또는 파일을 찾지 못했습니다',
    unavailable: '경로를 읽지 못했습니다 · 서버 상태와 공유 경로를 확인하세요',
    invalid_file: '일반 파일을 지정하세요',
    changed: '검사 중 파일이 바뀌었습니다 · 다시 확인하세요',
    too_large: '파일이 16 MiB를 초과하여 해시 계산을 중단했습니다',
    busy: '이전 검사에 대한 Windows 응답을 기다리는 중입니다',
    timeout: '10초 안에 검사 응답을 받지 못했습니다',
  }
  return (
    <div role="status" className="grid min-w-0 gap-1 rounded-md border p-2 text-sm">
      <p>{messages[result.status] ?? messages.unavailable}</p>
      {result.sha256 && (
        <div>
          <div className="path-label">서버 파일 SHA-256</div>
          <div className="mono break-all">{result.sha256}</div>
        </div>
      )}
    </div>
  )
}

export function ServerManager({
  open,
  onOpenChange,
  profiles,
  onProfilesChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profiles: Profile[]
  onProfilesChange: (profiles: Profile[]) => void
}) {
  const [alias, setAlias] = useState('')
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState<{ id: string; check: ServerCheck } | null>(null)

  function save(next: Profile[]) {
    try {
      localStorage.setItem(profileKey, JSON.stringify(next))
      onProfilesChange(next)
    } catch {
      setError('서버 목록을 이 앱에 저장하지 못했습니다')
      return false
    }
    return true
  }

  async function add(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (!alias.trim() || control.test(alias) || profiles.length >= maxProfiles) {
      setError('서버 별칭과 등록 한도 40개를 확인하세요')
      return
    }
    setBusy('save')
    try {
      const normalized = await validateServerShare(path)
      if (
        profiles.some(
          (item) =>
            item.alias.toLowerCase() === alias.trim().toLowerCase() ||
            item.path.toLowerCase() === normalized.toLowerCase(),
        )
      ) {
        setError('이미 등록된 별칭 또는 공유 경로입니다')
        return
      }
      if (save([...profiles, { id: crypto.randomUUID(), alias: alias.trim(), path: normalized }])) {
        setAlias('')
        setPath('')
      }
    } catch {
      setError('공유 경로를 \\\\서버\\공유 형식으로 확인하세요')
    } finally {
      setBusy('')
    }
  }

  async function test(profile: Profile) {
    setBusy(profile.id)
    setResult(null)
    setError('')
    try {
      setResult({ id: profile.id, check: await testServerShare(profile.path) })
    } catch {
      setError('공유 경로를 확인한 뒤 연결 테스트를 다시 시도하세요')
    } finally {
      setBusy('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>서버 연결</DialogTitle>
          <DialogDescription>
            신뢰하는 SMB 공유를 등록하세요. 테스트할 때 현재 Windows 세션으로 접속합니다.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={add}>
          <label className="grid gap-1 text-sm">
            서버 별칭
            <Input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              maxLength={80}
              required
              disabled={!!busy}
            />
          </label>
          <label className="grid gap-1 text-sm">
            공유 폴더
            <Input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="\\server\share"
              maxLength={4096}
              required
              disabled={!!busy}
              className="mono"
            />
          </label>
          <Button type="submit" disabled={!!busy} className="justify-self-end">
            공유 등록
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        <ul className="grid gap-2" aria-label="등록된 서버 공유">
          {profiles.map((profile) => (
            <li key={profile.id} className="grid gap-2 rounded-md border p-3">
              <strong className="break-all text-sm">{profile.alias}</strong>
              <span className="mono break-all text-xs">{profile.path}</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!busy}
                  onClick={() => void test(profile)}
                >
                  {busy === profile.id ? '연결 확인 중…' : '연결 테스트'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!busy}
                  onClick={() => {
                    setError('')
                    save(profiles.filter((item) => item.id !== profile.id))
                  }}
                >
                  삭제
                </Button>
              </div>
              {result?.id === profile.id && <CheckResult result={result.check} />}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

export function ScriptServerFile({
  profiles,
  scriptKey,
  onManage,
}: {
  profiles: Profile[]
  scriptKey: string
  onManage: () => void
}) {
  const key = 'wsd-server-file-v1:' + scriptKey
  const [link, setLink] = useState(() => loadLink(key))
  const [profileId, setProfileId] = useState(link?.profile ?? '')
  const [file, setFile] = useState(link?.file ?? '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ServerCheck | null>(null)
  const heading = useId()
  const linkedProfile = profiles.find((item) => item.id === link?.profile)

  async function connect(event: FormEvent) {
    event.preventDefault()
    if (busy || !profiles.some((item) => item.id === profileId)) return
    setError('')
    setBusy('save')
    try {
      const relative = await validateServerFile(file)
      const next = { profile: profileId, file: relative }
      localStorage.setItem(key, JSON.stringify(next))
      setLink(next)
      setFile(relative)
      setResult(null)
    } catch {
      setError('공유 폴더 기준의 상대 경로와 앱 저장소를 확인하세요')
    } finally {
      setBusy('')
    }
  }

  async function inspect() {
    if (busy || !link || !linkedProfile) return
    setBusy('inspect')
    setError('')
    setResult(null)
    try {
      setResult(await inspectServerFile(linkedProfile.path, link.file))
    } catch {
      setError('파일 검사를 시작하지 못했습니다 · 공유와 파일 경로를 확인하세요')
    } finally {
      setBusy('')
    }
  }

  function disconnect() {
    try {
      localStorage.removeItem(key)
      setLink(null)
      setProfileId('')
      setFile('')
      setResult(null)
      setError('')
    } catch {
      setError('파일 연결을 삭제하지 못했습니다')
    }
  }

  return (
    <section className="mt-4 grid min-w-0 gap-2 border-t pt-3" aria-labelledby={heading}>
      <h3 className="text-sm font-semibold" id={heading}>
        서버 파일 연결
      </h3>
      {profiles.length ? (
        <form className="grid gap-2" onSubmit={connect}>
          <label className="grid min-w-0 gap-1 text-xs">
            서버 공유
            <select
              className="h-8 min-w-0 rounded-md border bg-background px-2 text-sm"
              value={profiles.some((item) => item.id === profileId) ? profileId : ''}
              onChange={(event) => setProfileId(event.target.value)}
              disabled={!!busy}
              required
            >
              <option value="">공유 선택</option>
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.alias}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs">
            공유 기준 파일 경로
            <Input
              value={file}
              onChange={(event) => setFile(event.target.value)}
              placeholder="scripts/backup.sh"
              maxLength={4096}
              required
              disabled={!!busy}
              className="mono"
            />
          </label>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!!busy}
            className="justify-self-start"
          >
            파일 연결
          </Button>
        </form>
      ) : (
        <Button size="sm" variant="outline" className="justify-self-start" onClick={onManage}>
          공유 등록하기
        </Button>
      )}
      {link && (
        <div className="grid min-w-0 gap-2 rounded-md border p-2 text-xs">
          <p className="break-all">
            {linkedProfile ? linkedProfile.alias + ' · ' + link.file : '등록에서 삭제된 공유입니다'}
          </p>
          <div className="flex flex-wrap gap-2">
            {linkedProfile && (
              <Button size="sm" variant="outline" onClick={() => void inspect()} disabled={!!busy}>
                {busy === 'inspect' ? '파일 확인 중…' : '읽기·SHA-256 확인'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={disconnect} disabled={!!busy}>
              연결 해제
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {result && linkedProfile && <CheckResult result={result} file />}
    </section>
  )
}
