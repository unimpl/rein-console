import { expect, test } from '@playwright/test'

test('scoped messages, task states, overlay details and resizable panes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const chat = page.getByRole('region', { name: '群聊', exact: true })
  await expect(chat.getByRole('heading', { name: '网关稳定性' })).toBeVisible()
  await page.getByRole('textbox', { name: '发送消息', exact: true }).fill('确认使用 staging 环境')
  await page.getByRole('textbox', { name: '发送消息', exact: true }).press('Enter')
  await expect(chat.getByText('确认使用 staging 环境')).toBeVisible()
  await expect(chat.getByText('已收到你的消息。', { exact: false })).toBeVisible()
  await page.getByText('访问控制优化', { exact: true }).click()
  await expect(chat.getByText('确认使用 staging 环境')).toHaveCount(0)
  await expect(chat.getByText('先梳理角色与访问权限，再确认认证边界。')).toBeVisible()
  await page.getByRole('navigation').getByText('网关稳定性', { exact: true }).click()
  await expect(chat.getByText('确认使用 staging 环境')).toBeVisible()
  const originalChat = await chat.boundingBox()
  const originalTasks = await page.getByRole('region', { name: '任务栏' }).boundingBox()
  await page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  await expect(page.getByRole('region', { name: '任务详情' })).toBeVisible()
  await expect.poll(async () => (await chat.boundingBox())?.width).toBe(originalChat!.width)
  expect((await page.getByRole('region', { name: '任务栏' }).boundingBox())?.width).toBe(
    originalTasks!.width,
  )
  await page.getByRole('button', { name: '展开任务详情' }).click()
  await expect
    .poll(async () => (await page.locator('.task-detail').boundingBox())?.width)
    .toBeGreaterThan(1200)
  await page.getByRole('button', { name: '恢复抽屉宽度' }).click()
  await page.getByRole('button', { name: '接管输入' }).click()
  await page.getByRole('textbox', { name: '模拟终端命令' }).fill('npm test')
  await page.getByRole('textbox', { name: '模拟终端命令' }).press('Enter')
  await expect(page.getByText('模拟终端已接收输入；未执行真实命令。')).toBeVisible()
  await page.getByRole('tab', { name: '活动', exact: true }).click()
  await expect(page.getByText('用户向 sam 发送模拟输入')).toBeVisible()
  await page.getByRole('button', { name: '查看会话记录' }).click()
  await expect(page.getByRole('dialog')).toContainText('T-24-sam')
  await page.getByRole('button', { name: '关闭会话记录' }).click()
  await page.getByRole('tab', { name: '结果', exact: true }).click()
  await page.getByRole('button', { name: '模拟完成任务' }).click()
  await expect(page.locator('.result-panel')).toContainText('任务已完成')
  await page.getByRole('button', { name: '关闭任务详情' }).click()
  await expect(
    page
      .getByRole('region', { name: '任务栏' })
      .getByRole('region', { name: '已完成', exact: true }),
  ).toContainText('修复网关间歇 503')
  const separator = page.getByRole('separator', { name: '调整聊天与任务栏宽度' })
  const rect = await separator.boundingBox()
  await page.mouse.move(rect!.x, rect!.y + 350)
  await page.mouse.down()
  await page.mouse.move(rect!.x - 90, rect!.y + 350, { steps: 8 })
  await page.mouse.up()
  expect((await chat.boundingBox())!.width).toBeLessThan(originalChat!.width - 70)
  const saved = await page.evaluate(() => localStorage.getItem('rein.split'))
  await page.reload()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rein.split'))).toBe(saved)
  await page.getByRole('button', { name: '收起侧栏' }).click()
  await expect(page.getByRole('complementary', { name: '工作空间导航' })).toHaveCount(0)
  await page.getByRole('button', { name: '展开侧栏' }).click()
  await expect(page.getByRole('complementary', { name: '工作空间导航' })).toBeVisible()
  await expect(page.locator('img')).not.toHaveCount(0)
  expect(
    await page
      .locator('img')
      .evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
  ).toBe(true)
  expect(errors).toEqual([])
})

test('settings persist, account menu stays usable with details, logout confirms and demo login works', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  await page.getByRole('button', { name: '个人菜单', exact: true }).click()
  await page.getByRole('menuitem', { name: '设置', exact: true }).click()
  await page.getByRole('combobox', { name: '发送消息方式' }).selectOption('Ctrl / ⌘ + Enter 发送')
  await expect(page.getByRole('status').filter({ hasText: '更改已保存到此设备' })).toBeVisible()
  await page
    .getByRole('navigation', { name: '配置分类' })
    .getByText('通知', { exact: true })
    .click()
  await page.getByRole('switch', { name: '提示音', exact: true }).click()
  await expect(page.getByRole('switch', { name: '提示音', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page
    .getByRole('navigation', { name: '配置分类' })
    .getByText('执行环境', { exact: true })
    .click()
  await page.getByRole('combobox', { name: '最大并发任务' }).selectOption('5 个任务')
  await page
    .getByRole('navigation', { name: '配置分类' })
    .getByText('模型与连接', { exact: true })
    .click()
  await expect(page.getByText('模拟连接', { exact: true })).toHaveCount(3)
  await page.getByRole('button', { name: '添加连接', exact: true }).click()
  await page.getByRole('textbox', { name: '连接名称' }).fill('演示 Provider')
  await page.getByRole('button', { name: '保存模拟配置' }).click()
  await expect(page.getByText('演示 Provider', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭配置' }).click()
  await page.getByRole('button', { name: '关闭任务详情' }).click()
  await page.reload()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('rein.preferences')!)),
  ).toMatchObject({ sound: true, concurrency: '5 个任务', sendMode: 'Ctrl / ⌘ + Enter 发送' })
  await page.getByRole('button', { name: '个人菜单', exact: true }).click()
  await page.getByRole('menuitem', { name: '退出登录', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('退出登录？')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('region', { name: '群聊', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '个人菜单', exact: true }).click()
  await page.getByRole('menuitem', { name: '退出登录', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill('demo@example.com')
  await page.locator('#login-password').fill('demo1234')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('region', { name: '群聊', exact: true })).toBeVisible()
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('demo1234')
})

test('narrow windows keep task controls, navigation, drawer and configuration accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '任务', exact: true }).click()
  for (const width of [390, 1000]) {
    await page.setViewportSize({ width, height: 844 })
    await expect
      .poll(async () => {
        const groups = await page.locator('.task-group').evaluateAll((elements) =>
          elements.map((el) => {
            const box = el.getBoundingClientRect()
            const lastCard = el.querySelector('.task-card:last-child')?.getBoundingClientRect()
            return {
              top: box.top,
              bottom: box.bottom,
              left: box.left,
              right: box.right,
              lastCardBottom: lastCard?.bottom ?? box.top,
            }
          }),
        )
        return groups.every(
          (group, i) =>
            group.bottom >= group.lastCardBottom &&
            (i === 0 || group.top >= groups[i - 1].bottom || group.left >= groups[i - 1].right),
        )
      })
      .toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  await expect(page.getByRole('button', { name: '关闭任务详情' })).toBeInViewport()
  await expect(page.getByRole('button', { name: '接管输入' })).toBeInViewport()
  await page.getByRole('button', { name: '接管输入' }).click()
  await expect(page.getByRole('textbox', { name: '模拟终端命令' })).toBeInViewport()
  await page.getByRole('button', { name: '关闭任务详情' }).click()
  await page.getByRole('button', { name: '展开侧栏' }).click()
  await page.getByRole('navigation').getByText('访问控制优化', { exact: true }).click()
  await page.getByRole('button', { name: '群聊', exact: true }).click()
  await expect(page.getByRole('heading', { name: '访问控制优化' })).toBeVisible()
  await page.getByRole('button', { name: '个人菜单', exact: true }).click()
  await page.getByRole('menuitem', { name: '设置', exact: true }).click()
  await page.getByRole('combobox', { name: '发送消息方式' }).selectOption('Ctrl / ⌘ + Enter 发送')
  await page.getByRole('button', { name: '关闭配置' }).click()
  for (const width of [360, 768, 1000, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('textbox', { name: '发送消息', exact: true })).toBeInViewport()
  }
})
