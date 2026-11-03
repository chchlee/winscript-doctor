import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('검색과 필터가 결과 수와 진단 상세에 반영된다', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '운영 스크립트 점검' })).toBeVisible()
  await expect(page.getByText('합성 예제', { exact: true })).toBeVisible()
  await expect(page.locator('.inventory-table tbody tr')).toHaveCount(6)
  await page.getByRole('textbox', { name: '스크립트 검색' }).fill('backup')
  await expect(page.locator('.inventory-table tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: '검색 초기화' }).click()
  await page.getByRole('button', { name: '확인 필요', exact: true }).click()
  await expect(page.locator('.inventory-table tbody tr')).toHaveCount(3)
  await page.getByRole('button', { name: /legacy-notify.ps1/ }).click()
  await expect(
    page.getByText('대상 계정의 접근 여부가 미확인입니다', { exact: true }),
  ).toBeVisible()
  await page.getByRole('textbox', { name: '스크립트 검색' }).fill('존재하지않는파일')
  await expect(page.getByRole('heading', { name: '검색 결과가 없습니다' })).toBeVisible()
})

test('차이와 미확인을 구분하고 다른 비교 기준으로 전환한다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /이 작업의 환경 비교/ }).click()
  await expect(page.locator('h1')).toBeInViewport()
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(8)
  await page.getByRole('button', { name: /^차이만/ }).click()
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(6)
  await page.getByRole('button', { name: /^미확인/ }).click()
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.comparison-table tbody')).toContainText('네트워크 자원 접근')
  await page.getByLabel('비교할 작업').selectOption('comparison-sync')
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(8)
  await expect(page.locator('.comparison-summary')).toContainText('차이 0')
  await expect(page.locator('.comparison-summary')).toContainText('미확인 0')
  await page.getByRole('button', { name: '좌우 바꾸기' }).click()
  await expect(page.locator('.context-grid section').first()).toContainText('예약 실행 기준')
})

test('테마 선택이 유지되고 좁은 화면에 가로 넘침이 없다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '어두운 테마로 전환' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(page.getByRole('heading', { name: '운영 스크립트 점검' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page
    .getByRole('button', { name: /환경 비교/, exact: false })
    .first()
    .click()
  await expect(page.locator('.comparison-table')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('가져오기에서 잘못된 JSON을 거부하고 정상 스냅샷을 연다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '스냅샷 열기', exact: true }).click()
  await page.getByLabel('스냅샷 JSON 파일').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"secret":"do-not-display"}'),
  })
  await expect(page.getByRole('alert')).toContainText('지원하는 스냅샷')
  await expect(page.getByText('do-not-display')).toHaveCount(0)
  const snapshot = JSON.parse(readFileSync('../fixtures/demo-workspace.json', 'utf8'))
  snapshot.id = 'import-test'
  snapshot.host.name = 'SRV-IMPORTED'
  snapshot.demo = false
  await page.getByLabel('스냅샷 JSON 파일').setInputFiles({
    name: 'snapshot.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(snapshot)),
  })
  await expect(page.getByRole('button', { name: '가져오기', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '가져오기', exact: true }).click()
  await expect(page.locator('.snapshot-host')).toHaveText('SRV-IMPORTED')
  await expect(page.getByText('가져온 스냅샷', { exact: true })).toBeVisible()
})

test('저장한 JSON을 다시 가져올 수 있다', async ({ page }) => {
  await page.goto('/')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '결과 저장', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  await page.getByRole('button', { name: '스냅샷 열기', exact: true }).click()
  await page.getByLabel('스냅샷 JSON 파일').setInputFiles(path!)
  await expect(page.getByRole('button', { name: '가져오기', exact: true })).toBeEnabled()
})

test('두 화면에서 런타임 오류와 외부 네트워크 요청이 없다', async ({ page }) => {
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5173') && !request.url().startsWith('data:'))
      external.push(request.url())
  })
  await page.goto('/')
  await page.getByRole('button', { name: /이 작업의 환경 비교/ }).click()
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(8)
  await page.getByRole('button', { name: '수집 근거 자세히' }).click()
  await expect(page.getByRole('dialog')).toContainText('수집 근거')
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

test('같은 예약 작업의 다른 스크립트에 비교 자료를 잘못 연결하지 않는다', async ({ page }) => {
  await page.goto('/')
  const snapshot = JSON.parse(readFileSync('../fixtures/demo-workspace.json', 'utf8'))
  snapshot.scripts[1].taskName = 'NightlyBackup'
  await page.getByRole('button', { name: '스냅샷 열기', exact: true }).click()
  await page.getByLabel('스냅샷 JSON 파일').setInputFiles({
    name: 'shared-task.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(snapshot)),
  })
  await page.getByRole('button', { name: '가져오기', exact: true }).click()
  await page.getByRole('button', { name: /export-ad-users.ps1/ }).click()
  await expect(page.getByRole('button', { name: /이 작업의 환경 비교/ })).toHaveCount(0)
  await page.getByRole('button', { name: /backup.ps1/ }).click()
  await expect(page.getByRole('button', { name: /이 작업의 환경 비교/ })).toBeVisible()
})

test('가져오기 취소 후 늦게 끝난 파일 확인이 새 창에 나타나지 않는다', async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.text
    File.prototype.text = async function () {
      const result = await original.call(this)
      await new Promise((resolve) => setTimeout(resolve, 500))
      ;(window as Window & { snapshotReadFinished?: boolean }).snapshotReadFinished = true
      return result
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: '스냅샷 열기', exact: true }).click()
  await page.getByLabel('스냅샷 JSON 파일').setInputFiles('../fixtures/demo-workspace.json')
  await expect(page.getByText('파일을 확인하고 있습니다')).toBeVisible()
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await page.getByRole('button', { name: '스냅샷 열기', exact: true }).click()
  await page.waitForFunction(
    () => (window as Window & { snapshotReadFinished?: boolean }).snapshotReadFinished,
  )
  await expect(page.locator('.import-preview')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '가져오기', exact: true })).toBeDisabled()
})
