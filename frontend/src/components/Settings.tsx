import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/components/LanguageProvider'
import appInfo from '@/version.json'

export function Settings({
  open,
  onOpenChange,
  dark,
  onThemeChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dark: boolean
  onThemeChange: (dark: boolean) => void
}) {
  const { language, changeLanguage, t } = useLanguage()
  const [error, setError] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('설정')}</DialogTitle>
          <DialogDescription>
            {t('파일·공유 연결과 언어 설정은 이 기기에 보관됩니다.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-2">
          <div className="grid gap-2">
            <label htmlFor="display-language" className="text-sm font-semibold">
              {t('언어')}
            </label>
            <p className="text-sm text-muted-foreground">
              {t('영어가 기본 언어입니다. 선택한 언어는 이 기기에 저장됩니다.')}
            </p>
            <select
              id="display-language"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={language}
              onChange={(event) => {
                setError(!changeLanguage(event.target.value === 'ko' ? 'ko' : 'en'))
              }}
            >
              <option value="en" lang="en">
                English
              </option>
              <option value="ko" lang="ko">
                한국어
              </option>
            </select>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-semibold">{t('화면 모드')}</span>
            <div className="flex gap-2">
              <Button
                variant={dark ? 'outline' : 'default'}
                aria-pressed={!dark}
                onClick={() => onThemeChange(false)}
              >
                <Sun size={16} />
                {t('밝게')}
              </Button>
              <Button
                variant={dark ? 'default' : 'outline'}
                aria-pressed={dark}
                onClick={() => onThemeChange(true)}
              >
                <Moon size={16} />
                {t('어둡게')}
              </Button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t('설정을 저장하지 못했습니다. 앱 저장소에 접근할 수 있는지 확인하세요.')}
            </p>
          )}
          <p className="border-t pt-4 text-xs text-muted-foreground">
            WinScript Doctor · {t('버전')} {appInfo.version}
          </p>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('닫기')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
