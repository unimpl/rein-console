import { expect, test } from '@playwright/test'

test('HTTP loads recent history once and SSE resumes missed output without polling', async ({
  page,
  request,
}) => {
  let history = 0,
    streams = 0,
    polls = 0
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.pathname.endsWith('/history')) history++
    if (/\/api\/agents\/[^/]+\/events$/.test(url.pathname)) streams++
    if (url.pathname === '/api/runs' && req.method() === 'GET') polls++
    if (/\/api\/runs\/[^/]+\/events$/.test(url.pathname)) polls++
  })
  await page.goto('/')
  await page.getByRole('button', { name: '与codex对话', exact: true }).click()
  await expect(page.getByRole('log')).toHaveAttribute('aria-busy', 'false')
  await expect.poll(() => streams).toBe(1)
  const initial = history
  await page.waitForTimeout(2000)
  expect(history).toBe(initial)
  expect(polls).toBe(0)
  const response = page.waitForResponse(
    (res) => new URL(res.url()).pathname === '/api/runs' && res.request().method() === 'POST',
  )
  await page.getByRole('textbox', { name: '发送消息', exact: true }).fill('hello')
  await page.getByRole('textbox', { name: '发送消息', exact: true }).press('Enter')
  const { run } = await (await response).json()
  await expect(page.getByRole('log').locator('.hub-state-label').last()).toHaveText('已完成')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const created = await request.post('/api/runs', {
    data: {
      request_id: crypto.randomUUID(),
      agent_id: run.agentId,
      session_id: run.sessionId,
      prompt: 'while hidden',
    },
  })
  expect(created.ok()).toBeTruthy()
  const next = (await created.json()).run
  await expect
    .poll(async () => (await (await request.get(`/api/runs/${next.id}`)).json()).run.state)
    .toBe('RUN_STATE_COMPLETED')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('log').getByText('Hello 2', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('log').getByText('Hello 1', { exact: true })).toHaveCount(1)
  expect(streams).toBe(2)
  expect(history).toBe(initial)
  expect(polls).toBe(0)
})

test('scrolling up pages older HTTP history and keeps the reading position during live output', async ({
  page,
  request,
}) => {
  const registry = await (await request.get('/api/agents')).json()
  const agentId = registry.agents.find(
    (item: { agent: { name: string } }) => item.agent.name === 'pi',
  ).agent.id
  const initial = await (await request.get(`/api/agents/${agentId}/history`)).json()
  let history = 0
  let olderRequests = 0
  let release: () => void = () => {}
  const olderResponse = new Promise<void>((resolve) => {
    release = resolve
  })
  const record = (index: number) => ({
    version: '0',
    run: {
      id: `history-${index}`,
      attemptId: `attempt-${index}`,
      sessionId: 'history-session',
      agentId,
      state: 'RUN_STATE_COMPLETED',
      cancelRequested: false,
    },
    prompt: `history prompt ${index}`,
    created_at: `2025-01-01T00:00:${String(index).padStart(2, '0')}Z`,
    command_acks: [],
    events: [
      {
        attempt: { runId: `history-${index}`, attemptId: `attempt-${index}` },
        sequence: '1',
        text: {
          itemId: `item-${index}`,
          text: `history answer ${index}`,
          complete: true,
          reasoning: false,
        },
      },
    ],
  })
  await page.route('**/api/agents/*/history?*', async (route) => {
    history++
    const older = new URL(route.request().url()).searchParams.has('before')
    if (older) {
      olderRequests++
      await olderResponse
    }
    await route.fulfill({
      json: {
        runs: Array.from({ length: older ? 5 : 20 }, (_, i) => record(i + (older ? 1 : 6))),
        sessions: [{ id: 'history-session', prompt: 'history' }],
        session_id: 'history-session',
        next_cursor: older ? '' : 'older-page',
        stream_cursor: initial.stream_cursor,
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '与pi对话', exact: true }).click()
  const panel = page.getByRole('log')
  await expect(panel.getByText('history prompt 25', { exact: true })).toBeVisible()
  await expect(panel.getByText('history prompt 1', { exact: true })).toHaveCount(0)
  const initialRequests = history
  expect(olderRequests).toBe(0)
  await panel.evaluate((element) => {
    element.scrollTop = 0
  })
  await expect.poll(() => olderRequests).toBe(1)
  const anchor = panel.locator('[data-run-anchor="history-6-user"]')
  const top = (await anchor.boundingBox())!.y
  release()
  await expect(panel.getByText('history prompt 1', { exact: true })).toHaveCount(1)
  expect(Math.abs((await anchor.boundingBox())!.y - top)).toBeLessThan(3)
  const live = await request.post('/api/runs', {
    data: {
      request_id: crypto.randomUUID(),
      agent_id: agentId,
      session_id: 'history-session',
      prompt: 'live while reading',
    },
  })
  expect(live.ok()).toBeTruthy()
  await expect(panel.getByText('Hello 1', { exact: true })).toHaveCount(1)
  expect(Math.abs((await anchor.boundingBox())!.y - top)).toBeLessThan(3)
  expect(history).toBe(initialRequests + 1)
})

test('history errors offer HTTP retry without a polling loop', async ({ page }) => {
  let requests = 0
  let fail = true
  await page.route('**/api/agents/*/history?*', async (route) => {
    requests++
    if (fail) await route.fulfill({ status: 503, json: { error: 'history retry check' } })
    else await route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: '与codex对话', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('history retry check')
  const initialRequests = requests
  await page.waitForTimeout(2000)
  expect(requests).toBe(initialRequests)
  fail = false
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.getByRole('log')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('alert').filter({ hasText: 'history retry check' })).toHaveCount(0)
  expect(requests).toBe(initialRequests + 1)
})

test('registered native and A2A agents execute through Hub and retain conversation after refresh', async ({
  page,
}) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  await page.goto('/')
  for (const name of ['codex', 'pi', 'a2a-pi']) {
    await page.getByRole('button', { name: `与${name}对话`, exact: true }).click()
    const input = page.getByRole('textbox', { name: '发送消息', exact: true })
    await expect(input).toBeVisible()
    await input.fill('hello')
    await input.press('Enter')
    await expect(page.getByRole('log')).toContainText('Hello 1')
    await expect(page.getByRole('button', { name: '发送消息按钮', exact: true })).toBeDisabled()
    await expect(page.getByRole('log').locator('.hub-state-label').last()).toHaveText('已完成')
    await input.fill('again')
    await input.press('Enter')
    await expect(page.getByRole('log')).toContainText('Hello 2')
    await expect(page.getByRole('log').locator('.hub-state-label').last()).toHaveText('已完成')
    await page.reload()
    await page.getByRole('button', { name: `与${name}对话`, exact: true }).click()
    await expect(page.getByRole('log')).toContainText('Hello 1')
    await expect(page.getByRole('log')).toContainText('Hello 2')
  }
  await expect(page.getByRole('log')).not.toContainText('模拟回复')
  expect(failures).toEqual([])
})

test('approval and cancellation reach each native and A2A agent', async ({ page }) => {
  await page.goto('/')
  for (const name of ['codex', 'pi', 'a2a-pi']) {
    await page.getByRole('button', { name: `与${name}对话`, exact: true }).click()
    await page.getByRole('button', { name: '新对话', exact: true }).click()
    const input = page.getByRole('textbox', { name: '发送消息', exact: true })
    await input.fill('approval')
    await input.press('Enter')
    const form = page.getByLabel('Agent 交互请求', { exact: true })
    await expect(form).toBeVisible()
    await form
      .getByRole('button', { name: name === 'codex' ? '批准' : '确认', exact: true })
      .click()
    await expect(form).toHaveCount(0)
    await expect(page.getByRole('log').locator('.hub-state-label').last()).toHaveText('已完成')
    await page.getByRole('button', { name: '新对话', exact: true }).click()
    await input.fill('slow')
    await input.press('Enter')
    await expect(page.getByRole('button', { name: '停止执行', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '停止执行', exact: true }).click()
    await expect(page.getByRole('log').locator('.hub-state-label').last()).toHaveText('已取消')
  }
})

test('tool output, loading errors and mobile layout remain usable', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '与pi对话', exact: true }).click()
  await page.getByRole('button', { name: '新对话', exact: true }).click()
  const input = page.getByRole('textbox', { name: '发送消息', exact: true })
  await input.fill('execution')
  await input.press('Enter')
  await expect(page.getByRole('log').locator('.hub-state-label').last()).toHaveText('已完成')
  await expect(page.getByRole('log').locator('.hub-tool')).not.toHaveCount(0)
  await expect(page.getByRole('log').locator('.hub-reasoning')).not.toHaveCount(0)
  await page.screenshot({ path: 'test-results/hub-agent-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(input).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/hub-agent-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1600, height: 900 })
  const roster = await (await page.request.get('/api/agents')).json()
  const pi = roster.agents.find((item: { agent: { name: string } }) => item.agent.name === 'pi')
  pi.agent.disabled = true
  pi.online = false
  await page.route('**/api/agents', (route) => route.fulfill({ json: roster }))
  await page.getByRole('button', { name: '刷新 Agent 列表', exact: true }).click()
  await expect(page.locator('.chat-heading')).toContainText('Agent 已下线')
  await expect(page.getByRole('button', { name: '发送消息按钮', exact: true })).toBeDisabled()
  await expect(page.getByRole('log')).toContainText('Hello')
  await page.unroute('**/api/agents')
  await page.getByRole('button', { name: '刷新 Agent 列表', exact: true }).click()
  await expect(page.locator('.chat-heading')).toContainText('已连接')
  await page.route('**/api/agents', (route) =>
    route.fulfill({ status: 503, json: { error: 'Hub 暂时不可用' } }),
  )
  await page.getByRole('button', { name: '刷新 Agent 列表', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Hub 暂时不可用' })).toBeVisible()
  await expect(page.getByRole('log')).toContainText('Hello')
})
