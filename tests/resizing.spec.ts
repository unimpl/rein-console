import { expect, test } from '@playwright/test'

test('pane limits fill the viewport at either edge and survive reload and viewport changes', async ({
  page,
}) => {
  await page.goto('/')
  const separator = page.getByRole('separator', { name: '调整聊天与任务栏宽度' })
  for (const width of [1600, 3840, 1200, 1000]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(separator).toBeVisible()
    for (const destination of [0, width]) {
      const handle = await separator.boundingBox()
      await page.mouse.move(handle!.x, handle!.y + 350)
      await page.mouse.down()
      await page.mouse.move(destination, 350, { steps: 5 })
      await page.mouse.up()
      await expect
        .poll(async () => {
          const chat = await page.locator('.chat-panel').boundingBox()
          const todo = await page.locator('.task-panel').boundingBox()
          return (
            Math.abs(todo!.x + todo!.width - width) < 1 &&
            chat!.width >= 359.9 &&
            todo!.width >= 359.9
          )
        })
        .toBe(true)
      const before = await page.locator('.chat-panel').boundingBox()
      await page.reload()
      await expect
        .poll(async () => (await page.locator('.chat-panel').boundingBox())?.width)
        .toBeCloseTo(before!.width, 0)
    }
  }
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.getByRole('button', { name: '隐藏侧栏' }).click()
  await expect
    .poll(async () => {
      const todo = await page.locator('.task-panel').boundingBox()
      return todo!.x + todo!.width
    })
    .toBeCloseTo(1600, 0)
})

test('detail starts at Todo title edge and supports independent drag, restore, limits and keyboard resizing', async ({
  page,
}) => {
  await page.goto('/')
  const title = page.getByRole('heading', { name: 'Todo', exact: true })
  const chat = page.locator('.chat-panel')
  const taskPanel = page.locator('.task-panel')
  const paper = page.locator('.MuiDrawer-paper').filter({ has: page.locator('.task-detail') })
  const open = () =>
    page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  const chatBefore = await chat.boundingBox()
  const tasksBefore = await taskPanel.boundingBox()
  const titleBox = await title.boundingBox()
  await open()
  await expect
    .poll(async () => (await paper.boundingBox())?.x)
    .toBeCloseTo(titleBox!.x + titleBox!.width, 0)
  const defaultWidth = (await paper.boundingBox())!.width
  const handle = page.getByRole('separator', { name: '调整任务详情宽度' })
  await expect(handle).toBeVisible()
  const handleBox = await handle.boundingBox()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, 350)
  await page.mouse.down()
  await page.mouse.move(handleBox!.x - 150, 350, { steps: 8 })
  await page.mouse.up()
  const customWidth = (await paper.boundingBox())!.width
  expect(customWidth).toBeGreaterThan(defaultWidth + 140)
  expect((await chat.boundingBox())!.width).toBe(chatBefore!.width)
  expect((await taskPanel.boundingBox())!.width).toBe(tasksBefore!.width)
  await page.getByRole('button', { name: '展开任务详情' }).click()
  await expect.poll(async () => (await paper.boundingBox())?.x).toBe(296)
  await page.getByRole('button', { name: '恢复抽屉宽度' }).click()
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(customWidth, 0)
  await handle.focus()
  await handle.press('ArrowLeft')
  expect((await paper.boundingBox())!.width).toBeCloseTo(customWidth + 24, 0)
  for (const destination of [0, 1600]) {
    const box = await handle.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, 350)
    await page.mouse.down()
    await page.mouse.move(destination, 350, { steps: 8 })
    await page.mouse.up()
    const result = await paper.boundingBox()
    expect(result!.x).toBeGreaterThanOrEqual(296)
    expect(result!.width).toBeGreaterThanOrEqual(360)
    expect(result!.x + result!.width).toBeCloseTo(1600, 0)
  }
  await page.getByRole('button', { name: '关闭任务详情' }).click()
  const split = page.getByRole('separator', { name: '调整聊天与任务栏宽度' })
  for (const destination of [0, 1600]) {
    const box = await split.boundingBox()
    await page.mouse.move(box!.x, 350)
    await page.mouse.down()
    await page.mouse.move(destination, 350, { steps: 5 })
    await page.mouse.up()
    await open()
    await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(360, 0)
    await expect(page.getByRole('button', { name: '关闭任务详情' })).toBeInViewport()
    await expect(page.getByRole('button', { name: '接管输入' })).toBeInViewport()
    expect(
      await page.locator('.detail-tabs').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '关闭任务详情' }).click()
  }
  await open()
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(360, 0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(async () => {
      const box = await paper.boundingBox()
      return box!.x >= 0 && box!.x + box!.width <= 390.1
    })
    .toBe(true)
  await expect(page.getByRole('button', { name: '关闭任务详情' })).toBeInViewport()
  await expect(page.getByRole('button', { name: '接管输入' })).toBeInViewport()
})

test('manual detail ratio is shared by all tasks, scales with the window and survives refresh until resized', async ({
  page,
}) => {
  await page.goto('/')
  const paper = page.locator('.MuiDrawer-paper').filter({ has: page.locator('.task-detail') })
  const openTask = (title: string) =>
    page.getByRole('button', { name: `打开任务 ${title}`, exact: true }).click()
  const close = () => page.getByRole('button', { name: '关闭任务详情' }).click()
  await openTask('修复网关间歇 503')
  const handle = page.getByRole('separator', { name: '调整任务详情宽度' })
  const box = await handle.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, 350)
  await page.mouse.down()
  await page.mouse.move(850, 350, { steps: 8 })
  await page.mouse.up()
  const ratio = await page.evaluate(() => JSON.parse(localStorage.getItem('rein.detailRatio')!))
  expect(ratio).toBeCloseTo(750 / 1600, 4)
  await close()
  await openTask('检查认证配置')
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(ratio * 1600, 0)
  await page.setViewportSize({ width: 2000, height: 1000 })
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(ratio * 2000, 0)
  await page.getByRole('button', { name: '展开任务详情' }).click()
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(2000 - 296, 0)
  await page.getByRole('button', { name: '恢复抽屉宽度' }).click()
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(ratio * 2000, 0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rein.detailRatio')!))).toBe(
    ratio,
  )
  await page.setViewportSize({ width: 1600, height: 900 })
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(ratio * 1600, 0)
  await page.reload()
  await openTask('完善错误日志')
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(ratio * 1600, 0)
  await handle.focus()
  await handle.press('ArrowLeft')
  const nextRatio = await page.evaluate(() => JSON.parse(localStorage.getItem('rein.detailRatio')!))
  expect(nextRatio).toBeGreaterThan(ratio)
  await close()
  await openTask('修复网关间歇 503')
  await expect.poll(async () => (await paper.boundingBox())?.width).toBeCloseTo(nextRatio * 1600, 0)
})
