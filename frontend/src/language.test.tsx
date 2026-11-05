import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { Settings } from './components/Settings'
import { LanguageProvider, translate } from './components/LanguageProvider'

beforeEach(() => localStorage.clear())

it('keeps imported text safe when it resembles object prototype properties', () => {
  for (const value of ['constructor', '__proto__', 'toString', '<script>synthetic</script>']) {
    expect(translate(value, 'en')).toBe(value)
    expect(translate(value, 'ko')).toBe(value)
  }
})

it('starts in English and retains the selected language across application restarts', async () => {
  const view = render(<App />)
  await screen.findByRole('heading', { name: 'Script inventory', level: 1 })
  expect(document.documentElement.lang).toBe('en')
  expect(document.body.textContent).not.toMatch(/[가-힣]/u)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search scripts' }), {
    target: { value: 'export' },
  })
  fireEvent.click(screen.getByRole('button', { name: /export-ad-users.ps1/u }))
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ko' } })
  expect(screen.getByRole('dialog', { name: '설정' })).toBeVisible()
  expect(document.documentElement.lang).toBe('ko')
  fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: '닫기' })[0])
  expect(screen.getByRole('textbox', { name: '스크립트 검색' })).toHaveValue('export')
  expect(screen.getByRole('button', { name: /export-ad-users.ps1/u })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  view.unmount()

  render(<App />)
  await screen.findByRole('heading', { name: '운영 스크립트 점검', level: 1 })
  fireEvent.click(screen.getByRole('button', { name: '설정' }))
  fireEvent.change(screen.getByLabelText('언어'), { target: { value: 'en' } })
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  expect(localStorage.getItem('wsd-language')).toBe('en')
})

it('uses English when a saved language is unsupported', async () => {
  localStorage.setItem('wsd-language', 'unsupported')
  render(<App />)
  await screen.findByRole('heading', { name: 'Script inventory', level: 1 })
})

it('keeps the selected language when preference storage rejects a change', async () => {
  render(
    <LanguageProvider>
      <Settings open onOpenChange={() => {}} dark={false} onThemeChange={() => {}} />
    </LanguageProvider>,
  )
  const saved = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Synthetic storage failure')
  })
  try {
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ko' } })
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
        'Could not save settings',
      ),
    )
    expect(screen.getByLabelText('Language')).toHaveValue('en')
  } finally {
    saved.mockRestore()
  }
})
