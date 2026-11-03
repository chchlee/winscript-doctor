import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('../docs/screenshots', { recursive: true })
const native = process.argv.includes('--native')
const browser = native
  ? await chromium.connectOverCDP('http://127.0.0.1:9435')
  : await chromium.launch({
      channel:
        process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
      headless: true,
    })
const context = native
  ? browser.contexts()[0]
  : await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = native
  ? (context.pages().find((page) => page.url().includes('wails')) ?? context.pages()[0])
  : await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
if (!native) await page.goto('http://127.0.0.1:5173')
await page.getByRole('heading', { name: '운영 스크립트 점검' }).waitFor()
await page.locator('.inventory-table tbody tr').first().waitFor()
await page.screenshot({
  path: `../docs/screenshots/${native ? 'native-' : ''}overview.png`,
  fullPage: true,
})
await page.getByRole('button', { name: /이 작업의 환경 비교/ }).click()
await page.locator('.comparison-table tbody tr').first().waitFor()
await page.screenshot({
  path: `../docs/screenshots/${native ? 'native-' : ''}comparison.png`,
  fullPage: true,
})
const evidence = await page.evaluate(() => ({
  title: document.title,
  desktop:
    typeof window.chrome?.webview?.postMessage === 'function' ||
    typeof window.webkit?.messageHandlers?.external?.postMessage === 'function',
  rowCount: document.querySelectorAll('.comparison-table tbody tr').length,
  summary: document.querySelector('.comparison-summary')?.textContent,
  error: document.querySelector('[role="alert"]')?.textContent ?? null,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
}))
if (!native) {
  await page.getByRole('button', { name: '어두운 테마로 전환' }).click()
  await page.screenshot({ path: '../docs/screenshots/comparison-dark.png', fullPage: true })
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.screenshot({ path: '../docs/screenshots/comparison-compact.png', fullPage: true })
}
console.log(JSON.stringify({ ...evidence, errors }))
await browser.close()
