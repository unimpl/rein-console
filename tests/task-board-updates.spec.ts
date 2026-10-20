import { expect, test } from '@playwright/test'

test('idle tasks drag to reorder and move between columns, while occupied sessions stay locked', async ({
  page,
}) => {
  await page.goto('/')
  await page.screenshot({ path: '/tmp/rein-todo-review/board.png' })
  const card = (id: string) => page.locator(`[data-task-id="${id}"]`)
  const todo = page.locator('.task-group-todo')
  const done = page.locator('.task-group-done')
  await expect(card('T-20')).toHaveAttribute('draggable', 'true')
  await expect(card('T-24')).toHaveAttribute('draggable', 'false')
  await expect(card('T-25')).toHaveAttribute('draggable', 'false')
  await card('T-21').dragTo(card('T-20'), { targetPosition: { x: 40, y: 8 } })
  await expect(todo.locator('.task-card').first()).toHaveAttribute('data-task-id', 'T-21')
  await card('T-21').dragTo(done.locator('.group-header'))
  await expect(done.locator('[data-task-id="T-21"]')).toBeVisible()
  await expect(todo.locator('.task-card')).toHaveCount(1)
  await card('T-21').dragTo(page.locator('.task-group-running .group-header'))
  await expect(page.locator('.task-group-running [data-task-id="T-21"]')).toContainText('待执行')
  await expect(card('T-21')).toHaveAttribute('draggable', 'true')
  await page.getByRole('button', { name: 'T-24任务操作', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: '上移任务' })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: '移至已完成', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  await page.getByRole('button', { name: '停止任务', exact: true }).click()
  await page.getByRole('button', { name: '关闭任务详情' }).click()
  await expect(card('T-24')).toHaveAttribute('draggable', 'true')
  await card('T-24').dragTo(done.locator('.group-header'))
  await expect(done.locator('[data-task-id="T-24"]')).toBeVisible()
})

test('outside click dismisses details, documents stay open, and results expose all artifacts', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  await expect(page.getByRole('tab', { name: '任务', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('.spec-phase li.completed > div > span').first()).toHaveCSS(
    'text-decoration-line',
    'none',
  )
  await page.screenshot({ path: '/tmp/rein-todo-review/tasks.png' })
  await page.getByRole('textbox', { name: '发送消息', exact: true }).click()
  await expect(page.getByRole('region', { name: '任务详情' })).toHaveCount(0)
  await page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  await page.getByRole('tab', { name: '结果', exact: true }).click()
  await page.getByRole('button', { name: '模拟完成任务' }).click()
  const results = page.getByRole('region', { name: '任务执行结果' })
  await expect(results).toContainText('全部 5 项验收条件已通过')
  await expect(results.locator('.result-section')).toHaveCount(4)
  await page
    .locator('.detail-tabs')
    .evaluate((el) =>
      Promise.all(
        el
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
    )
  await page.screenshot({ path: '/tmp/rein-todo-review/results.png' })
  await results.getByRole('button', { name: '查看完整文档方案' }).click()
  await expect(page.getByRole('dialog')).toContainText('AC-05')
  await page.getByRole('button', { name: '关闭结果文档' }).click()
  await expect(page.getByRole('region', { name: '任务详情' })).toBeVisible()
  await results.locator('summary').filter({ hasText: '代码变更' }).click()
  await results.getByRole('button', { name: 'PR #128', exact: false }).click()
  await expect(page.getByRole('dialog')).toContainText('尚未关联真实仓库链接')
  await page.getByRole('button', { name: '关闭结果文档' }).click()
  await results.locator('summary').filter({ hasText: '测试结果' }).click()
  await expect(results.getByText('端到端验收 · 1 passed')).toBeVisible()
})
