import { expect, test, type Page } from '@playwright/test'

const detail = (page: Page) => page.getByRole('region', { name: '任务详情', exact: true })
const detailPaper = (page: Page) => page.locator('.MuiDrawer-paper').filter({ has: detail(page) })
const openDetail = (page: Page) =>
  page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
const expectLeft = (page: Page, left: number) =>
  expect.poll(async () => (await detailPaper(page).boundingBox())?.x).toBeCloseTo(left, 0)

async function dragDetail(page: Page, left: number) {
  const handle = await page.getByRole('separator', { name: '调整任务详情宽度' }).boundingBox()
  await page.mouse.move(handle!.x + handle!.width / 2, 350)
  await page.mouse.down()
  await page.mouse.move(left, 350, { steps: 8 })
  await page.mouse.up()
}

test('sidebar toggles preserve open detail content and an undocked position', async ({ page }) => {
  await page.goto('/')
  await openDetail(page)
  await page.getByRole('tab', { name: 'CLI', exact: true }).click()
  const left = (await detailPaper(page).boundingBox())!.x
  for (const name of ['收起侧栏', '展开侧栏']) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect(detail(page)).toBeVisible()
    await expectLeft(page, left)
    await expect(page.getByRole('tab', { name: 'CLI', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  }
  await page.getByRole('textbox', { name: '发送消息', exact: true }).click()
  await expect(detail(page)).toHaveCount(0)
})

test('a detail touching the sidebar follows it until manually resized', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await openDetail(page)
  await dragDetail(page, 296)
  await expectLeft(page, 296)
  const savedRatio = await page.evaluate(() => localStorage.getItem('rein.detailRatio'))
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click()
  await expectLeft(page, 56)
  await page.screenshot({ path: testInfo.outputPath('detail-docked-desktop.png') })
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click()
  await expectLeft(page, 296)
  expect(await page.evaluate(() => localStorage.getItem('rein.detailRatio'))).toBe(savedRatio)

  await dragDetail(page, 640)
  await expectLeft(page, 640)
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click()
  await expectLeft(page, 640)
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click()
  await expectLeft(page, 640)

  await dragDetail(page, 296)
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click()
  await expectLeft(page, 56)
  await page.getByRole('separator', { name: '调整任务详情宽度' }).press('ArrowRight')
  await expectLeft(page, 80)
  await page.setViewportSize({ width: 1800, height: 900 })
  await expectLeft(page, 90)
})

test('a detail pushed against the sidebar stays attached on subsequent toggles', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click()
  await openDetail(page)
  await dragDetail(page, 160)
  await expectLeft(page, 160)
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click()
  await expectLeft(page, 296)
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click()
  await expectLeft(page, 56)
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click()
  await expectLeft(page, 296)
})

test('expanded details follow the sidebar and restore their previous custom width', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await openDetail(page)
  await dragDetail(page, 640)
  await page.getByRole('button', { name: '展开任务详情', exact: true }).click()
  await expectLeft(page, 296)
  await page.getByRole('button', { name: '收起侧栏', exact: true }).click()
  await expectLeft(page, 56)
  await page.getByRole('button', { name: '展开侧栏', exact: true }).click()
  await expectLeft(page, 296)
  await page.getByRole('button', { name: '恢复抽屉宽度', exact: true }).click()
  await expectLeft(page, 640)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: '关闭任务详情' })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('detail-mobile.png') })
})
