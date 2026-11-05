import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const screenshotPath = (name: string) =>
  fileURLToPath(new URL('../../docs/screenshots/' + name, import.meta.url))

test('English is the default and Korean settings persist without resetting the workspace', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Script inventory', level: 1 })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.locator('body').innerText()).not.toMatch(/[가-힣]/u)
  await page.getByRole('textbox', { name: 'Search scripts' }).fill('export')
  await page.getByRole('button', { name: /export-ad-users.ps1/u }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByLabel('Language', { exact: true }).selectOption('ko')
  const settings = page.getByRole('dialog', { name: '설정', exact: true })
  await expect(settings).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
  await settings.getByRole('button', { name: '닫기', exact: true }).last().click()
  await expect(page.getByRole('textbox', { name: '스크립트 검색' })).toHaveValue('export')
  await expect(page.getByRole('button', { name: /export-ad-users.ps1/u })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: '운영 스크립트 점검', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: '설정', exact: true }).click()
  await page.getByLabel('언어', { exact: true }).selectOption('en')
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('en')
})

test('English comparison and bundled fonts render at desktop and minimum window sizes', async ({
  page,
}) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5173') && !request.url().startsWith('data:'))
      external.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Script inventory', level: 1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(
    await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain('Nanum Gothic')
  await page.screenshot({ path: screenshotPath('overview.png') })
  await page.getByRole('button', { name: 'Environment comparison', exact: true }).click()
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(8)
  expect(await page.locator('body').innerText()).not.toMatch(/[가-힣]/u)
  await page.screenshot({ path: screenshotPath('comparison.png') })
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click()
  await page.screenshot({ path: screenshotPath('comparison-dark.png') })
  await page.setViewportSize({ width: 1024, height: 768 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
  await page.getByLabel('Language', { exact: true }).selectOption('ko')
  await page.screenshot({ path: screenshotPath('settings-ko.png') })
  expect(external).toEqual([])
})
