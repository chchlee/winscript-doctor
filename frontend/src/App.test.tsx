import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import demo from '../../fixtures/demo-workspace.json'
import collected from '../../fixtures/collected-workspace.json'
import type { Workspace } from './lib/doctor'
import App from './App'

const bridge = vi.hoisted(() => ({ collect: vi.fn(), cancel: vi.fn(), load: vi.fn() }))
vi.mock('@/lib/doctor', async (original) => ({
  ...(await original<typeof import('./lib/doctor')>()),
  collectionCapabilities: async () => true,
  collectLocal: bridge.collect,
  cancelCollection: bridge.cancel,
  loadWorkspace: bridge.load,
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  bridge.load.mockResolvedValue(structuredClone(demo))
  bridge.cancel.mockResolvedValue(true)
})

async function begin() {
  render(<App />)
  await waitFor(() => expect(screen.getByRole('button', { name: '로컬 수집' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: '로컬 수집' }))
  const start = screen.getByRole('button', { name: '폴더 선택 후 수집' })
  await waitFor(() => expect(start).toBeEnabled())
  fireEvent.click(start)
}

describe('native collection flow', () => {
  it('cancels through the service and keeps completed observations', async () => {
    let complete!: (workspace: Workspace | null) => void
    bridge.collect.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    await begin()
    expect(bridge.collect).toHaveBeenCalledOnce()
    expect(screen.getByText('결과 저장').closest('button')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '수집 중단' }))
    await waitFor(() => expect(bridge.cancel).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: '수집 중단' })).toBeDisabled()
    const result = structuredClone(collected) as Workspace
    result.demo = false
    result.collection!.status = 'cancelled'
    await act(async () => complete(result))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const scope = screen.getByRole('region', { name: '수집 범위와 제한' })
    expect(within(scope).getByText('중단한 수집')).toBeVisible()
    expect(screen.getByRole('button', { name: '결과 저장' })).toBeEnabled()
    expect(screen.getByText(result.scripts[0].sha256!)).toBeVisible()
  })

  it('keeps the previous workspace when folder selection is cancelled', async () => {
    bridge.collect.mockResolvedValue(null)
    await begin()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('region', { name: '수집 범위와 제한' })).not.toBeInTheDocument()
    expect(screen.getByText('합성 예제')).toBeVisible()
    expect(screen.getByRole('button', { name: '결과 저장' })).toBeEnabled()
  })

  it('preserves the previous result and hides native error details on failure', async () => {
    bridge.collect.mockRejectedValue(new Error('PRIVATE_SOURCE_DETAIL'))
    await begin()
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(screen.getByRole('alert')).not.toHaveTextContent('PRIVATE_SOURCE_DETAIL')
    expect(screen.getByText('합성 예제')).toBeVisible()
  })
})
