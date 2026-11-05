import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { checkForUpdate, openUpdateDownload } from '@/lib/doctor'
import { AppUpdates } from './AppUpdates'

vi.mock('@/lib/doctor', () => ({
  isDesktop: () => true,
  checkForUpdate: vi.fn(),
  openUpdateDownload: vi.fn(),
}))

const release = {
  currentVersion: '0.1.1',
  version: '0.1.2',
  file: 'Setup.exe',
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(checkForUpdate).mockReset().mockResolvedValue(release)
  vi.mocked(openUpdateDownload).mockReset().mockResolvedValue(undefined)
  vi.useFakeTimers()
})

afterEach(() => vi.useRealTimers())

async function runStartupCheck() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500)
  })
}

it('suppresses only the skipped version at startup and still offers it on manual check', async () => {
  const initial = render(<AppUpdates blocked={false} />)
  await runStartupCheck()
  expect(screen.getByRole('dialog')).toHaveTextContent('0.1.2')
  fireEvent.click(screen.getByLabelText('이 버전 다시 보지 않기'))
  fireEvent.click(screen.getByRole('button', { name: '나중에' }))
  initial.unmount()

  const next = render(<AppUpdates blocked={false} />)
  await runStartupCheck()
  expect(screen.queryByRole('dialog')).toBeNull()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '업데이트 확인' })))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '업데이트 파일 받기' })))
  expect(openUpdateDownload).toHaveBeenCalledWith('0.1.2')
  next.unmount()

  vi.mocked(checkForUpdate).mockResolvedValue({ ...release, version: '0.1.3' })
  render(<AppUpdates blocked={false} />)
  await runStartupCheck()
  expect(screen.getByRole('dialog')).toHaveTextContent('0.1.3')
})
