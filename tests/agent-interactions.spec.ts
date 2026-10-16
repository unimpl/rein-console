import { expect, test } from '@playwright/test'

test('header avatars and author names mention the Agent at the composer caret', async ({
  page,
}) => {
  await page.goto('/')
  const input = page.getByRole('textbox', { name: '发送消息', exact: true })
  const sam = page.locator('.header-members').getByRole('button', { name: '提及 Sam', exact: true })
  await sam.hover()
  await expect(page.getByRole('tooltip')).toHaveText('Sam')
  await sam.click()
  await expect(input).toHaveValue('@Sam ')
  await expect(input).toBeFocused()
  await input.fill('请检查连接池')
  await input.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(1, 1))
  await page
    .locator('.header-members')
    .getByRole('button', { name: '提及 Alex', exact: true })
    .click()
  await expect(input).toHaveValue('请 @Alex 检查连接池')
  await input.fill('')
  await page.getByRole('log').getByRole('button', { name: '提及 Robin', exact: true }).click()
  await expect(input).toHaveValue('@Robin ')
  await input.fill('')
  await page.getByRole('log').getByRole('button', { name: '回复 Alex', exact: true }).click()
  await expect(input).toHaveValue('@Alex ')
  await expect(input).toBeFocused()
  await input.press('End')
  await input.pressSequentially('目标环境是 staging')
  await input.press('Enter')
  await expect(page.getByRole('log')).toContainText('@Alex 目标环境是 staging')
})

test('Agent settings are hidden until hover and basic edits propagate without changing identity', async ({
  page,
}) => {
  await page.goto('/')
  const settings = page.getByRole('button', { name: 'Sam设置', exact: true })
  await page.getByRole('textbox', { name: '发送消息', exact: true }).focus()
  await page.locator('.chat-heading').hover()
  await expect(settings).toHaveCSS('opacity', '0')
  await page.getByRole('button', { name: '与Sam对话', exact: true }).hover()
  await expect(settings).toHaveCSS('opacity', '0.6')
  await settings.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: '基本设置', exact: true })).toBeVisible()
  await dialog.getByRole('textbox', { name: '名称', exact: true }).fill('Morgan')
  await dialog.getByRole('textbox', { name: '名称', exact: true }).press('Tab')
  await expect(dialog.getByRole('status')).toContainText('配置已保存')
  await dialog.getByRole('textbox', { name: '描述', exact: true }).fill('实现服务与自动化测试')
  await dialog.getByRole('combobox', { name: 'Agent 类型', exact: true }).selectOption('claude')
  await dialog.getByRole('button', { name: '本地配置', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: '可执行文件', exact: true })).toHaveValue(
    'claude',
  )
  await dialog.getByRole('button', { name: '关闭 Agent 设置', exact: true }).click()
  const morgan = page.getByRole('button', { name: '与Morgan对话', exact: true })
  await expect(morgan.locator('img.MuiAvatar-img')).toHaveAttribute('src', '/providers/claude.svg')
  await expect(page.locator('.task-assignee').first()).toContainText('Morgan')
  await expect(page.getByRole('log')).toContainText('Morgan · 开发')
  await morgan.click()
  await expect(page.getByRole('heading', { name: 'Morgan', exact: true })).toBeVisible()
  await expect(page.getByRole('log')).toContainText('可以在这里直接与我交流')
  await page.getByRole('button', { name: 'Morgan设置', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: '描述', exact: true })).toHaveValue(
    '实现服务与自动化测试',
  )
  await dialog.getByRole('textbox', { name: '名称', exact: true }).fill('Alex')
  await dialog.getByRole('textbox', { name: '名称', exact: true }).press('Tab')
  await expect(dialog.getByRole('alert')).toContainText('已有同名 Agent')
  await dialog.getByRole('button', { name: '关闭 Agent 设置', exact: true }).click()
  await expect(morgan).toBeVisible()
})

test('Agent creation shares the configuration shell and the project viewport uses remaining sidebar space', async ({
  page,
}) => {
  await page.goto('/')
  const projectList = page.getByRole('region', { name: '项目列表', exact: true })
  const initialHeight = (await projectList.boundingBox())!.height
  expect(initialHeight).toBeGreaterThan(480)
  for (const [name, provider] of [
    ['Taylor', 'pi'],
    ['Casey', 'codex'],
  ]) {
    await page.getByRole('button', { name: '新建 Agent', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '新建 Agent', exact: true })
    await expect(dialog.getByRole('button', { name: '创建 Agent', exact: true })).toBeDisabled()
    await dialog.getByRole('textbox', { name: '名称', exact: true }).fill(name)
    await dialog.getByRole('textbox', { name: '描述', exact: true }).fill('前端演示助手')
    await dialog.getByRole('combobox', { name: 'Agent 类型', exact: true }).selectOption(provider)
    await dialog.getByRole('button', { name: 'A2A 配置', exact: true }).click()
    await dialog
      .getByRole('textbox', { name: '服务地址', exact: true })
      .fill('http://127.0.0.1:9000/a2a')
    await dialog.getByRole('button', { name: '创建 Agent', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: `与${name}对话`, exact: true }).locator('img.MuiAvatar-img'),
    ).toHaveAttribute('src', `/providers/${provider}.svg`)
  }
  expect((await projectList.boundingBox())!.height).toBeCloseTo(initialHeight - 72, 0)
  await page.getByRole('button', { name: '与Taylor对话', exact: true }).click()
  await expect(page.getByRole('log')).toContainText('你好，我是 Taylor')
  await page.getByRole('button', { name: 'Taylor设置', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'A2A 配置', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: '服务地址', exact: true })).toHaveValue(
    'http://127.0.0.1:9000/a2a',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await dialog.getByRole('button', { name: '基本设置', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'Agent 类型', exact: true })).toBeInViewport()
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('waiting tasks and messages have explicit readable emphasis and update with task state', async ({
  page,
}) => {
  await page.goto('/')
  for (const [status, color] of [
    ['待开始', 'rgb(245, 242, 250)'],
    ['进行中', 'rgb(239, 245, 255)'],
    ['已完成', 'rgb(237, 247, 241)'],
  ])
    await expect(
      page
        .locator('.task-group')
        .filter({ has: page.getByRole('heading', { name: status, exact: true }) }),
    ).toHaveCSS('background-color', color)
  const waitingCard = page.locator('.task-card').filter({ hasText: '#T-25' })
  await expect(waitingCard).toHaveClass(/waiting-task/)
  await expect(waitingCard.locator('.needs-reply-badge')).toHaveText('需你回复')
  await expect(waitingCard).toHaveCSS('border-top-color', 'rgb(184, 134, 39)')
  const bubble = page.locator('.waiting-message')
  await expect(bubble).toHaveCSS('background-color', 'rgb(255, 249, 235)')
  await expect(bubble.getByRole('button', { name: '回复 Alex', exact: true })).toHaveText(
    '需要你回复',
  )
  await page.getByRole('button', { name: 'T-25任务操作', exact: true }).click()
  await page.getByRole('menuitem', { name: '移至已完成', exact: true }).click()
  await expect(waitingCard).not.toHaveClass(/waiting-task/)
  await expect(waitingCard.locator('.needs-reply-badge')).toHaveCount(0)
})
