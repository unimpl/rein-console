import type { AppData, ChatScope, Project, Requirement, Task, TaskStatus } from '../types'
import { seed } from './seed'
import { agentConfigService } from './agentConfigService'

// Replace this adapter with HTTP/WebSocket calls when a backend is available.
let data: AppData = structuredClone(seed)
const subscribers = new Set<(data: AppData) => void>()
const time = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
function publish() {
  subscribers.forEach((fn) => fn(structuredClone(data)))
}
export const reinService = {
  async getData() {
    return structuredClone(data)
  },
  subscribe(fn: (value: AppData) => void) {
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  },
  async login(email: string, password: string) {
    if (!email.includes('@') || password.length < 4)
      throw new Error('请输入有效邮箱和至少 4 位演示密码。')
    return { name: 'Haibin', mode: 'demo' as const }
  },
  async sendMessage(scopeId: string, content: string) {
    const message = {
      id: crypto.randomUUID(),
      scopeId,
      authorId: 'me',
      time: time(),
      content: content.trim(),
    }
    if (!message.content) return
    data.messages.push(message)
    publish()
    window.setTimeout(() => {
      data.messages.push({
        id: crypto.randomUUID(),
        scopeId,
        authorId: scopeId.startsWith('agent-') ? scopeId.slice(6) : 'alex',
        time: time(),
        content: '已收到你的消息。这是模拟回复；接入运行服务后，Agent 将在此继续处理。',
      })
      publish()
    }, 650)
  },
  async updateTask(id: string, patch: Partial<Pick<Task, 'status' | 'execution' | 'statusText'>>) {
    data.tasks = data.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
    data.sessions
      .filter((s) => s.taskId === id)
      .forEach((s) => {
        s.activities.push({ time: time(), text: patch.statusText ?? '任务状态已更新' })
        s.lines.push({ text: `> ${patch.statusText ?? '任务状态已更新'}（模拟）`, tone: 'muted' })
      })
    publish()
  },
  async command(taskId: string, agentId: string, command: string) {
    const session = data.sessions.find((s) => s.taskId === taskId && s.agentId === agentId)
    if (!session) return
    session.lines.push(
      { text: `$ ${command}` },
      { text: '模拟终端已接收输入；未执行真实命令。', tone: 'cyan' },
    )
    session.activities.push({ time: time(), text: `用户向 ${agentId} 发送模拟输入` })
    publish()
  },
  async createTask(requirementId: string, title: string, status: TaskStatus) {
    const id = `T-${Math.max(...data.tasks.map((t) => Number(t.id.slice(2)))) + 1}`
    data.tasks.push({
      id,
      title,
      requirementId,
      agentId: 'sam',
      status,
      execution: status === 'todo' ? 'queued' : status === 'running' ? 'executing' : 'completed',
      statusText: status === 'todo' ? '待执行' : status === 'running' ? '执行中' : '已完成',
      description: title,
    })
    data.sessions.push({
      id: `${id}-sam`,
      taskId: id,
      agentId: 'sam',
      startedAt: time(),
      lines: [{ text: '> 模拟任务已创建' }],
      activities: [{ time: time(), text: '用户创建任务' }],
    })
    publish()
  },
  async saveProject(input: { id?: string; name: string; description: string }) {
    const name = input.name.trim()
    if (!name) throw new Error('请输入项目名称。')
    if (data.projects.some((p) => p.id !== input.id && p.name === name))
      throw new Error('此工作空间已有同名项目。')
    let project: Project
    if (input.id) {
      const existing = data.projects.find((p) => p.id === input.id)
      if (!existing) throw new Error('项目不存在，请重新选择。')
      project = { ...existing, name, description: input.description.trim() }
      data.projects = data.projects.map((p) => (p.id === project.id ? project : p))
    } else {
      project = {
        id: crypto.randomUUID(),
        name,
        description: input.description.trim(),
        workspaceId: data.workspace.id,
        requirementIds: [],
      }
      data.projects.unshift(project)
      data.workspace.projectIds.unshift(project.id)
    }
    publish()
    return structuredClone(project)
  },
  async saveRequirement(
    projectId: string,
    input: { id?: string; name: string; description: string },
  ) {
    const project = data.projects.find((p) => p.id === projectId)
    if (!project) throw new Error('请选择所属项目。')
    const title = input.name.trim()
    if (!title) throw new Error('请输入需求名称。')
    if (
      data.requirements.some(
        (r) => r.projectId === projectId && r.id !== input.id && r.title === title,
      )
    )
      throw new Error('此项目已有同名需求。')
    if (input.id && !data.requirements.some((r) => r.id === input.id && r.projectId === projectId))
      throw new Error('需求不存在，请重新选择。')
    const requirement: Requirement = {
      id: input.id ?? crypto.randomUUID(),
      title,
      description: input.description.trim(),
      projectId,
    }
    if (input.id)
      data.requirements = data.requirements.map((r) => (r.id === input.id ? requirement : r))
    else {
      data.requirements.push(requirement)
      project.requirementIds.push(requirement.id)
    }
    publish()
    return structuredClone(requirement)
  },
  async exportData() {
    return JSON.stringify({ mode: 'mock', ...data }, null, 2)
  },
  async reset() {
    agentConfigService.reset()
    data = structuredClone(seed)
    publish()
  },
}
export const defaultScope: ChatScope = {
  id: 'gateway',
  title: '网关稳定性',
  label: '当前需求',
  projectId: 'gatewaykit',
  requirementId: 'gateway',
}
export function tasksInScope(data: AppData, scope: ChatScope) {
  return data.tasks.filter(
    (t) =>
      (!scope.requirementId || t.requirementId === scope.requirementId) &&
      (!scope.projectId ||
        data.requirements.find((r) => r.id === t.requirementId)?.projectId === scope.projectId) &&
      (!scope.status || t.status === scope.status),
  )
}
