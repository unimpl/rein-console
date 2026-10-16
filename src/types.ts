export type TaskStatus = 'todo' | 'running' | 'done'
export type ExecutionState = 'queued' | 'executing' | 'waiting' | 'completed' | 'stopped'
export interface Workspace {
  id: string
  name: string
  projectIds: string[]
}
export interface Project {
  id: string
  name: string
  description?: string
  workspaceId: string
  requirementIds: string[]
}
export interface Requirement {
  id: string
  title: string
  description?: string
  projectId: string
}
export interface Agent {
  id: string
  name: string
  role: string
  color: string
  online: boolean
  cli: string
}
export interface Task {
  id: string
  title: string
  requirementId: string
  agentId: string
  reviewerId?: string
  status: TaskStatus
  execution: ExecutionState
  statusText: string
  description: string
}
export interface Message {
  id: string
  scopeId: string
  authorId: string
  time: string
  content: string
  taskIds?: string[]
  execution?: 'executing' | 'waiting'
}
export interface TerminalLine {
  text: string
  tone?: 'green' | 'cyan' | 'muted'
}
export interface Session {
  id: string
  taskId: string
  agentId: string
  startedAt: string
  lines: TerminalLine[]
  activities: { time: string; text: string }[]
}
export interface ChatScope {
  id: string
  title: string
  label: string
  projectId?: string
  requirementId?: string
  agentId?: string
  status?: TaskStatus
}
export interface AppData {
  workspace: Workspace
  projects: Project[]
  requirements: Requirement[]
  agents: Agent[]
  tasks: Task[]
  messages: Message[]
  sessions: Session[]
}
