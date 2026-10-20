import { expect, test } from '@playwright/test'

test('dependency lines follow visible tasks, status moves, filtering and stacked columns', async ({
  page,
}) => {
  await page.goto('/')
  const lines = page.locator('.task-dependencies > path')
  await expect(page.getByRole('button', { name: '任务流', exact: true })).toHaveCount(0)
  await expect(lines).toHaveCount(4)
  await expect(page.locator('[data-from="T-18"][data-to="T-24"]')).toHaveAttribute('d', /^M /)
  await expect(page.locator('[data-from="T-25"]')).toHaveCount(0)
  const before = await page.locator('[data-from="T-24"][data-to="T-20"]').getAttribute('d')
  await page.getByRole('button', { name: 'T-20任务操作' }).click()
  await page.getByRole('menuitem', { name: '移至已完成' }).click()
  await expect
    .poll(() => page.locator('[data-from="T-24"][data-to="T-20"]').getAttribute('d'))
    .not.toBe(before)
  await page.getByRole('button', { name: '筛选任务' }).click()
  await page.getByRole('menuitem', { name: 'Sam', exact: true }).click()
  await expect(lines).toHaveCount(2)
  await expect(page.locator('[data-from="T-19"]')).toHaveCount(0)
  await page.getByRole('button', { name: '筛选任务' }).click()
  await page.getByRole('menuitem', { name: '全部任务' }).click()
  await page.setViewportSize({ width: 900, height: 900 })
  await expect(lines).toHaveCount(4)
  await expect
    .poll(async () => {
      const groups = await page
        .locator('.task-group')
        .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().top))
      return groups[1] > groups[0]
    })
    .toBe(true)
  // Every routed segment must stay outside unrelated card interiors.
  expect(
    await page.locator('.task-groups').evaluate((board) => {
      const bounds = board.getBoundingClientRect()
      const cards = [...board.querySelectorAll<HTMLElement>('[data-task-id]')].map((card) => ({
        id: card.dataset.taskId,
        r: card.getBoundingClientRect(),
      }))
      return [...board.querySelectorAll<SVGPathElement>('.dependency-path')].every((path) => {
        const points = [...path.getAttribute('d')!.matchAll(/[ML] ([\d.-]+) ([\d.-]+)/g)].map(
          (m) => ({ x: Number(m[1]) + bounds.left, y: Number(m[2]) + bounds.top }),
        )
        return points.slice(1).every((q, i) =>
          cards
            .filter((c) => c.id !== path.dataset.from && c.id !== path.dataset.to)
            .every(({ r }) => {
              const p = points[i]
              return p.x === q.x
                ? !(
                    p.x > r.left &&
                    p.x < r.right &&
                    Math.max(p.y, q.y) > r.top &&
                    Math.min(p.y, q.y) < r.bottom
                  )
                : !(
                    p.y > r.top &&
                    p.y < r.bottom &&
                    Math.max(p.x, q.x) > r.left &&
                    Math.min(p.x, q.x) < r.right
                  )
            }),
        )
      })
    }),
  ).toBe(true)
})

test('activity opens with grouped Spec steps, supports collapse and tracks completion', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '打开任务 修复网关间歇 503', exact: true }).click()
  await expect(page.getByRole('tab', { name: '任务', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const progress = page.getByRole('region', { name: 'Spec 任务执行与追踪' })
  await expect(progress).toContainText('2/10 已完成')
  await expect(progress.locator('details')).toHaveCount(5)
  await expect(progress.locator('li')).toHaveCount(10)
  await expect(progress.getByText('当前阶段')).toHaveCount(1)
  await progress.locator('summary').filter({ hasText: 'Requirements' }).click()
  await expect(progress.getByText('分析故障场景与目标')).not.toBeVisible()
  await page.getByRole('tab', { name: '结果', exact: true }).click()
  await page.getByRole('button', { name: '模拟完成任务' }).click()
  await page.getByRole('tab', { name: '任务', exact: true }).click()
  await expect(progress).toContainText('10/10 已完成')
  await expect(progress.getByText('当前阶段')).toHaveCount(0)
})
