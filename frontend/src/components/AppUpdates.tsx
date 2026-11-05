import { useLanguage } from '@/components/LanguageProvider'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { checkForUpdate, isDesktop, openUpdateDownload, type UpdateInfo } from '@/lib/doctor'

const skippedVersionKey = 'wsd-update-skipped-version'

export function AppUpdates({ blocked }: { blocked: boolean }) {
  const { t } = useLanguage()

  const desktop = isDesktop()
  const inFlight = useRef(false)
  const [checking, setChecking] = useState(false)
  const [open, setOpen] = useState(false)
  const [offer, setOffer] = useState<UpdateInfo | null>(null)
  const [message, setMessage] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [skip, setSkip] = useState(false)
  const [opening, setOpening] = useState(false)

  const check = useCallback(async (manual: boolean) => {
    if (inFlight.current) return
    inFlight.current = true
    setChecking(true)
    try {
      const result = await checkForUpdate()
      if (
        result.version &&
        (manual || localStorage.getItem(skippedVersionKey) !== result.version)
      ) {
        setOffer(result)
        setMessage('')
        setSkip(false)
        setOpen(true)
      } else if (manual) {
        setOffer(null)
        setCurrentVersion(result.currentVersion)
        setMessage('현재 v{current}입니다. 이 기기에 설치할 새 버전이 없습니다.')
        setOpen(true)
      }
    } catch {
      if (manual) {
        setOffer(null)
        setMessage('업데이트를 확인할 수 없습니다. 인터넷 연결을 확인하고 다시 시도하세요.')
        setOpen(true)
      }
    } finally {
      inFlight.current = false
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (!desktop) return
    const timer = window.setTimeout(() => void check(false), 1500)
    return () => window.clearTimeout(timer)
  }, [check, desktop])

  function dismiss() {
    if (offer && skip) localStorage.setItem(skippedVersionKey, offer.version)
    setOpen(false)
  }

  async function download() {
    if (!offer || opening) return
    setOpening(true)
    try {
      await openUpdateDownload(offer.version)
      dismiss()
    } catch {
      setMessage('다운로드를 열 수 없습니다. 다시 시도하세요.')
    } finally {
      setOpening(false)
    }
  }

  if (!desktop) return null

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="icon-button"
        title={t('업데이트 확인')}
        aria-label={t('업데이트 확인')}
        disabled={blocked || checking}
        onClick={() => void check(true)}
      >
        <RefreshCw size={17} className={checking ? 'animate-spin' : undefined} />
      </Button>
      <Dialog
        open={open && !blocked}
        onOpenChange={(next) => {
          if (!next) dismiss()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(offer ? '새 업데이트가 있습니다' : '업데이트 확인')}</DialogTitle>
            <DialogDescription>
              {offer
                ? t('현재 v{current} → 새 버전 v{next}', {
                    current: offer.currentVersion,
                    next: offer.version,
                  })
                : t(message, { current: currentVersion })}
            </DialogDescription>
          </DialogHeader>
          {offer && (
            <>
              <p className="text-sm text-muted-foreground">
                {t(
                  '{file}을 브라우저에서 다운로드합니다. 결과를 저장하고 앱을 닫은 뒤 설치하세요.',
                  { file: offer.file },
                )}
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={skip}
                  onChange={(event) => setSkip(event.target.checked)}
                />
                {t('이 버전 다시 보지 않기')}
              </label>
              {message && (
                <p role="alert" className="text-sm text-destructive">
                  {t(message)}
                </p>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={dismiss}>
              {t(offer ? '나중에' : '확인')}
            </Button>
            {offer && (
              <Button onClick={() => void download()} disabled={opening}>
                {t('업데이트 파일 받기')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
