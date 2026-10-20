import type { AppData, Task, TerminalLine } from '../types'
import { createSpecPhases } from './spec'

const task = (
  id: string,
  title: string,
  agentId: string,
  status: Task['status'],
  execution: Task['execution'],
  statusText: string,
  description = title,
): Task => ({
  id,
  title,
  agentId,
  status,
  execution,
  statusText,
  description,
  requirementId: 'gateway',
  dependsOn:
    (
      { 'T-20': ['T-24'], 'T-21': ['T-22'], 'T-24': ['T-18'], 'T-22': ['T-19'] } as Record<
        string,
        string[]
      >
    )[id] ?? [],
  specPhases: createSpecPhases(title, status),
  ...(id === 'T-24' ? { reviewerId: 'robin' } : {}),
})
const tasks: Task[] = [
  task('T-20', '优化健康检查', 'sam', 'todo', 'queued', '等待前置任务'),
  task('T-21', '清理过期缓存', 'robin', 'todo', 'queued', '待执行'),
  task(
    'T-24',
    '修复网关间歇 503',
    'sam',
    'running',
    'executing',
    '回归测试中',
    '修复高并发下的连接释放问题，并完成代码复核。',
  ),
  task('T-22', '完善错误日志', 'sam', 'running', 'executing', '执行中'),
  task(
    'T-25',
    '检查认证配置',
    'alex',
    'running',
    'waiting',
    '等待回复',
    '检查认证配置，确认目标环境后继续。',
  ),
  task('T-18', '补充超时测试', 'sam', 'done', 'completed', '测试已通过'),
  task('T-19', '更新依赖版本', 'alex', 'done', 'completed', '已完成'),
  task('T-17', '整理错误码', 'robin', 'done', 'completed', '复核已通过'),
  { ...task('T-26', '梳理访问权限', 'alex', 'todo', 'queued', '待执行'), requirementId: 'access' },
  {
    ...task('T-27', '更新开发脚本', 'sam', 'running', 'executing', '执行中'),
    requirementId: 'tooling',
  },
]
const regression: TerminalLine[] = [
  { text: '$ codex' },
  { text: '> 检查连接释放与重试路径' },
  { text: 'src/gateway/proxy/balancer.rs', tone: 'cyan' },
  { text: '' },
  { text: '> Running regression tests...' },
  ...['retry_on_timeout', 'release_connection', 'mark_unhealthy'].map((name) => ({
    text: `✓ ${name}`,
    tone: 'green' as const,
  })),
  { text: '' },
  { text: '等待剩余测试完成…', tone: 'muted' },
]
export const seed: AppData = {
  workspace: {
    id: 'default',
    name: 'default',
    projectIds: [
      'gatewaykit',
      'devtools',
      ...Array.from({ length: 8 }, (_, i) => `demo-project-${i}`),
    ],
  },
  projects: [
    {
      id: 'gatewaykit',
      name: 'GatewayKit',
      workspaceId: 'default',
      requirementIds: ['gateway', 'access'],
    },
    { id: 'devtools', name: '开发者工具', workspaceId: 'default', requirementIds: ['tooling'] },
    ...[
      'Rein Console',
      '文档站点',
      '监控平台',
      '自动化工具',
      '故障排查',
      '集成测试',
      '发布流水线',
      '内部知识库',
    ].map((name, index) => ({
      id: `demo-project-${index}`,
      name,
      description: '示例项目',
      workspaceId: 'default',
      requirementIds: [],
    })),
  ],
  requirements: [
    { id: 'gateway', title: '网关稳定性', projectId: 'gatewaykit' },
    { id: 'access', title: '访问控制优化', projectId: 'gatewaykit' },
    { id: 'tooling', title: '开发脚本维护', projectId: 'devtools' },
  ],
  agents: [
    {
      id: 'alex',
      name: 'Alex',
      description: '负责架构设计与方案拆解。',
      role: '架构',
      color: '#08a56d',
      online: true,
      cli: 'Claude Code',
      provider: 'claude',
    },
    {
      id: 'sam',
      name: 'Sam',
      description: '实现与维护项目代码。',
      role: '开发',
      color: '#0866ff',
      online: true,
      cli: 'Codex',
      provider: 'codex',
    },
    {
      id: 'robin',
      name: 'Robin',
      description: '负责代码复核与质量检查。',
      role: '审查',
      color: '#8b31d5',
      online: false,
      cli: 'Pi',
      provider: 'pi',
    },
  ],
  tasks,
  messages: [
    ...['alex', 'sam', 'robin'].map((agentId) => ({
      id: `agent-welcome-${agentId}`,
      scopeId: `agent-${agentId}`,
      authorId: agentId,
      time: '14:20',
      content: '可以在这里直接与我交流。右侧 Memory 目前展示知识图谱示意，内容还在规划中。',
    })),
    {
      id: 'm1',
      scopeId: 'gateway',
      authorId: 'me',
      time: '14:20',
      content: '修复网关间歇 503。Sam 负责实现，Robin 复核；Alex 检查认证配置。',
    },
    {
      id: 'm2',
      scopeId: 'gateway',
      authorId: 'alex',
      time: '14:21',
      content:
        '已拆解任务并明确依赖：超时测试 → 修复 503 → 优化健康检查；更新依赖 → 完善日志 → 清理缓存。认证检查可并行进行。',
      taskIds: ['T-24', 'T-25'],
    },
    {
      id: 'm3',
      scopeId: 'gateway',
      authorId: 'sam',
      time: '14:24',
      content: '已定位连接释放问题，正在运行回归测试。',
      execution: 'executing',
    },
    {
      id: 'm4',
      scopeId: 'gateway',
      authorId: 'robin',
      time: '14:25',
      content: '我会检查异常路径与连接回收。',
    },
    {
      id: 'm5',
      scopeId: 'gateway',
      authorId: 'alex',
      time: '14:26',
      content: '认证检查需要确认目标环境。',
      execution: 'waiting',
    },
    {
      id: 'm6',
      scopeId: 'workspace',
      authorId: 'alex',
      time: '13:30',
      content: '这里是 default 工作空间对话，可讨论跨项目的工作安排。',
    },
    {
      id: 'm7',
      scopeId: 'project-gatewaykit',
      authorId: 'sam',
      time: '13:45',
      content: 'GatewayKit 的需求与任务已同步，可进入具体需求查看进展。',
    },
    {
      id: 'm8',
      scopeId: 'access',
      authorId: 'alex',
      time: '14:10',
      content: '先梳理角色与访问权限，再确认认证边界。',
      taskIds: ['T-26'],
    },
    {
      id: 'm9',
      scopeId: 'project-devtools',
      authorId: 'sam',
      time: '14:15',
      content: '正在整理开发脚本与本地工具。',
      taskIds: ['T-27'],
    },
    ...(['todo', 'running', 'done'] as const).map((status, i) => ({
      id: `group-${status}`,
      scopeId: `gateway-${status}`,
      authorId: 'alex',
      time: '14:27',
      content: [
        '待开始任务已整理，完成前置任务后可以启动。',
        '这里汇总进行中的任务，认证配置仍在等待你的回复。',
        '已完成任务的测试和复核记录可以在任务详情中查看。',
      ][i],
      taskIds: tasks
        .filter((t) => t.requirementId === 'gateway' && t.status === status)
        .map((t) => t.id),
    })),
  ],
  sessions: tasks.flatMap((t) =>
    ['alex', 'sam', 'robin'].map((agentId) => ({
      id: `${t.id}-${agentId}`,
      taskId: t.id,
      agentId,
      startedAt: '14:24',
      lines:
        t.id === 'T-24' && agentId === 'sam'
          ? regression
          : [
              { text: `$ ${agentId === 'sam' ? 'codex' : agentId === 'alex' ? 'claude' : 'pi'}` },
              { text: `> ${t.title}` },
              {
                text:
                  t.execution === 'waiting'
                    ? '等待用户确认目标环境…'
                    : t.status === 'done'
                      ? '✓ 任务已完成'
                      : '已载入任务上下文，等待下一步操作。',
                tone: t.status === 'done' ? ('green' as const) : ('muted' as const),
              },
            ],
      activities: [
        { time: '14:21', text: `Alex 创建任务 ${t.id}` },
        {
          time: '14:24',
          text:
            t.status === 'todo'
              ? '任务等待执行'
              : t.status === 'done'
                ? '任务已完成，结果可查看'
                : t.execution === 'waiting'
                  ? 'Agent 请求确认目标环境'
                  : `${agentId} 开始执行任务`,
        },
      ],
    })),
  ),
}
