import { expect, test } from '@playwright/test'

test('requirement rows expose hover editing and preserve task and conversation identity', async ({
  page,
}) => {
  await page.goto('/')
  const row = page.locator('.requirement-row').filter({ hasText: '网关稳定性' })
  const edit = row.getByRole('button', { name: '编辑需求 网关稳定性' })
  await page.getByRole('textbox', { name: '发送消息', exact: true }).focus()
  await page.locator('.chat-heading').hover()
  await expect(edit).toHaveCSS('opacity', '0')
  await row.hover()
  await expect(edit).toHaveCSS('opacity', '0.6')
  await expect(edit.locator('img')).toHaveAttribute('src', '/icons/material-edit.svg')
  await edit.click()
  await expect(page.getByRole('dialog')).toContainText('编辑需求')
  await expect(page.getByRole('textbox', { name: '需求名称' })).toHaveValue('网关稳定性')
  await page.getByRole('textbox', { name: '需求名称' }).fill('网关可靠性')
  await page.getByRole('textbox', { name: '描述', exact: true }).fill('连接复用与超时治理')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('heading', { name: '网关可靠性', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('log')).toContainText('修复网关间歇 503')
  await page.getByRole('button', { name: '编辑需求 网关可靠性' }).click()
  await expect(page.getByRole('textbox', { name: '描述', exact: true })).toHaveValue(
    '连接复用与超时治理',
  )
  await page.getByRole('textbox', { name: '需求名称' }).fill('访问控制优化')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('已有同名需求')
})

test('only the bounded project list scrolls with many expanded trees', async ({ page }) => {
  await page.setViewportSize({ width: 1330, height: 902 })
  await page.goto('/')
  const agentsBefore = await page.locator('.agent-roster').boundingBox()
  const accountBefore = await page.getByRole('button', { name: '个人菜单' }).boundingBox()
  await page.getByRole('button', { name: '展示更多', exact: true }).click()
  await page.getByRole('button', { name: '展示更多', exact: true }).click()
  const toggles = page.locator('.project-toggle')
  for (let i = 1; i < (await toggles.count()); i++) await toggles.nth(i).click()
  const list = page.getByRole('region', { name: '项目列表', exact: true })
  expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
  await list.evaluate((el) => {
    el.scrollTop = 0
  })
  await list.hover()
  await page.mouse.wheel(0, 400)
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  for (const height of [902, 560]) {
    await page.setViewportSize({ width: 1330, height })
    expect(
      await page
        .locator('.sidebar-scroll')
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true)
    expect(
      await page.locator('.sidebar').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true)
    await expect(page.getByRole('button', { name: 'Robin设置', exact: true })).toBeInViewport()
    await expect(page.getByRole('button', { name: '个人菜单' })).toBeInViewport()
  }
  await page.setViewportSize({ width: 1330, height: 902 })
  expect((await page.locator('.agent-roster').boundingBox())!.y).toBeCloseTo(agentsBefore!.y, 0)
  expect((await page.getByRole('button', { name: '个人菜单' }).boundingBox())!.y).toBeCloseTo(
    accountBefore!.y,
    0,
  )
})

test('collapsing navigation preserves chat width and gives released space to the right pane', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1330, height: 902 })
  await page.goto('/')
  const chat = page.locator('.chat-panel')
  const todo = page.locator('.task-panel')
  for (const customize of [false, true]) {
    if (customize) {
      const separator = page.getByRole('separator', { name: '调整聊天与任务栏宽度' })
      const box = (await separator.boundingBox())!
      await page.mouse.move(box.x, 350)
      await page.mouse.down()
      await page.mouse.move(890, 350, { steps: 5 })
      await page.mouse.up()
    }
    const before = (await chat.boundingBox())!
    const rightBefore = (await todo.boundingBox())!
    await page.getByRole('button', { name: '收起侧栏' }).click()
    await expect.poll(async () => (await chat.boundingBox())!.width).toBeCloseTo(before.width, 0)
    expect((await chat.boundingBox())!.x).toBeCloseTo(56, 0)
    expect((await todo.boundingBox())!.width).toBeCloseTo(rightBefore.width + 240, 0)
    expect((await todo.boundingBox())!.x + (await todo.boundingBox())!.width).toBeCloseTo(1330, 0)
    await page.reload()
    await expect.poll(async () => (await chat.boundingBox())!.width).toBeCloseTo(before.width, 0)
    await page.getByRole('button', { name: '展开侧栏' }).click()
    await expect.poll(async () => (await chat.boundingBox())!.width).toBeCloseTo(before.width, 0)
  }
})

test('provider avatars and isolated Agent settings work across all four categories', async ({
  page,
}) => {
  await page.goto('/')
  for (const [agent, provider] of [
    ['Alex', 'claude'],
    ['Sam', 'codex'],
    ['Robin', 'pi'],
  ])
    await expect(
      page.getByRole('button', { name: `与${agent}对话`, exact: true }).locator('.MuiAvatar-img'),
    ).toHaveAttribute('src', `/providers/${provider}.svg`)
  await page.getByRole('button', { name: 'Sam设置', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Agent 设置 · Sam' })
  await dialog.getByRole('button', { name: 'A2A 配置', exact: true }).click()
  await dialog.getByRole('textbox', { name: '服务地址', exact: true }).fill('not-an-address')
  await dialog.getByRole('textbox', { name: '服务地址', exact: true }).press('Tab')
  await expect(dialog.getByRole('alert')).toContainText('服务地址无效')
  await dialog
    .getByRole('textbox', { name: '服务地址', exact: true })
    .fill('http://127.0.0.1:9090/a2a')
  await dialog.getByRole('textbox', { name: '服务地址', exact: true }).press('Tab')
  await expect(dialog.getByRole('status')).toContainText('配置已保存')
  await dialog.getByRole('button', { name: '本地配置', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: '可执行文件', exact: true })).toHaveValue(
    'codex',
  )
  await dialog.getByRole('textbox', { name: '工作目录', exact: true }).fill('~/projects/gateway')
  await dialog.getByRole('combobox', { name: '审批方式', exact: true }).selectOption('只读')
  await dialog.getByRole('button', { name: 'SKILL 配置', exact: true }).click()
  await dialog.getByRole('textbox', { name: '启用的技能', exact: true }).fill('code-review')
  await dialog.getByRole('switch', { name: '自动发现', exact: true }).click()
  await dialog.getByRole('button', { name: '记忆存储', exact: true }).click()
  await dialog
    .getByRole('textbox', { name: '存储目录', exact: true })
    .fill('~/.rein/memory/gateway-sam')
  await dialog.getByRole('textbox', { name: '存储目录', exact: true }).press('Tab')
  await dialog.getByRole('button', { name: '关闭 Agent 设置', exact: true }).click()
  await page.getByRole('button', { name: 'Sam设置', exact: true }).click()
  await dialog.getByRole('button', { name: 'A2A 配置', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: '服务地址', exact: true })).toHaveValue(
    'http://127.0.0.1:9090/a2a',
  )
  await dialog.getByRole('button', { name: '记忆存储', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: '存储目录', exact: true })).toHaveValue(
    '~/.rein/memory/gateway-sam',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    dialog.getByRole('button', { name: '关闭 Agent 设置', exact: true }),
  ).toBeInViewport()
  await expect(dialog.getByRole('textbox', { name: '存储目录', exact: true })).toBeInViewport()
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await dialog.getByRole('button', { name: '关闭 Agent 设置', exact: true }).click()
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.getByRole('button', { name: 'Robin设置', exact: true }).click()
  await page.getByRole('button', { name: '本地配置', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '可执行文件', exact: true })).toHaveValue('pi')
  await expect(page.getByRole('textbox', { name: '工作目录', exact: true })).toHaveValue(
    '~/projects',
  )
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('gateway-sam')
})

test('chat and Todo toolbar settings are explicit placeholders', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '聊天设置', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('聊天设置功能待确定')
  await page.getByRole('button', { name: '任务栏设置', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('任务栏设置功能待确定')
  await expect(page.getByRole('button', { name: '新建任务', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '聊天范围说明', exact: true })).toHaveCount(0)
})
