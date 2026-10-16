import { useState } from 'react'
import { Divider, IconButton, ListItemButton, OutlinedInput, Tooltip } from '@mui/material'
import type { AppData, ChatScope, Project } from '../types'
import { Action, AgentAvatar, Icon, StatusDot } from './shared'

interface Props {
  data: AppData
  scope: ChatScope
  currentProjectId: string
  currentRequirementId?: string
  onScope: (scope: ChatScope) => void
  onHide: () => void
  onAccount: (el: HTMLElement) => void
  onWorkspace: (el: HTMLElement) => void
  onProject: (project?: Project) => void
  onRequirement: (projectId: string) => void
  userName: string
}
export function Sidebar({
  data,
  scope,
  currentProjectId,
  onScope,
  onHide,
  onAccount,
  onWorkspace,
  onProject,
  onRequirement,
  userName,
}: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ gatewaykit: true })
  const [visibleCount, setVisibleCount] = useState(5)
  const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase())
  const projects = data.projects.filter(
    (project) =>
      matches(project.name) ||
      data.requirements.some((r) => r.projectId === project.id && matches(r.title)),
  )
  const visibleProjects = search ? projects : projects.slice(0, visibleCount)
  return (
    <aside className="sidebar" aria-label="工作空间导航">
      <div className="workspace-header">
        <button className="workspace-select" onClick={(e) => onWorkspace(e.currentTarget)}>
          <Icon name="layers" size={20} />
          <span>{data.workspace.name}</span>
          <Icon name="down" />
        </button>
        <Action label="收起侧栏" icon="collapse" onClick={onHide} />
      </div>
      <div className="sidebar-scroll">
        <OutlinedInput
          className="sidebar-search"
          fullWidth
          placeholder="搜索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startAdornment={<Icon name="search" />}
          endAdornment={<span className="shortcut">⌘ K</span>}
          inputProps={{ 'aria-label': '搜索项目和需求' }}
        />
        <nav className="navigation" aria-label="项目与对话">
          {matches('工作空间对话') && (
            <ListItemButton
              component="button"
              selected={scope.id === 'workspace'}
              onClick={() => onScope({ id: 'workspace', title: '工作空间对话', label: '工作空间' })}
            >
              <Icon name="chat" />
              工作空间对话
            </ListItemButton>
          )}
          <Divider className="nav-divider" />
          <div className="nav-label">
            <span>项目</span>
            <Action
              label="新建项目"
              icon="plus"
              className="quiet-action"
              onClick={() => onProject()}
            />
          </div>
          {visibleProjects.map((project) => {
            const requirements = data.requirements.filter((r) => r.projectId === project.id)
            const open = search ? true : (expanded[project.id] ?? project.id === currentProjectId)
            return (
              <div className="project-tree" key={project.id} data-project-id={project.id}>
                <div className="project-row">
                  <ListItemButton
                    component="button"
                    className="project-toggle"
                    aria-label={`${open ? '收起' : '展开'}项目 ${project.name}`}
                    aria-expanded={open}
                    onClick={() => setExpanded((prev) => ({ ...prev, [project.id]: !open }))}
                  >
                    <span className={`tree-chevron ${open ? 'expanded' : ''}`}>
                      <Icon name="down" />
                    </span>
                    <Icon name="cube" />
                    <span className="nav-text">{project.name}</span>
                  </ListItemButton>
                  <Action
                    label={`编辑项目 ${project.name}`}
                    icon="edit"
                    className="project-edit quiet-action"
                    onClick={() => onProject(project)}
                  />
                </div>
                {open && (
                  <div className="project-children">
                    <ListItemButton
                      component="button"
                      className="tree-child"
                      selected={scope.id === `project-${project.id}`}
                      onClick={() =>
                        onScope({
                          id: `project-${project.id}`,
                          title: project.name,
                          label: '当前项目',
                          projectId: project.id,
                        })
                      }
                    >
                      <Icon name="chat" />
                      <span>项目对话</span>
                    </ListItemButton>
                    <div className="requirements-heading">
                      <span>需求</span>
                      <Action
                        label={`在${project.name}中新建需求`}
                        icon="plus"
                        className="quiet-action"
                        onClick={() => onRequirement(project.id)}
                      />
                    </div>
                    {requirements
                      .filter((r) => matches(r.title) || matches(project.name))
                      .map((requirement) => (
                        <div className="requirement-row" key={requirement.id}>
                          <ListItemButton
                            component="button"
                            className="tree-child"
                            selected={scope.id === requirement.id}
                            onClick={() =>
                              onScope({
                                id: requirement.id,
                                title: requirement.title,
                                label: '当前需求',
                                projectId: project.id,
                                requirementId: requirement.id,
                              })
                            }
                          >
                            <Icon name="doc" />
                            <span className="nav-text">{requirement.title}</span>
                          </ListItemButton>
                          <Action
                            label={`从${requirement.title}新建需求`}
                            icon="plus"
                            className="requirement-add quiet-action"
                            onClick={() => onRequirement(project.id)}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
          {!search && projects.length > visibleCount && (
            <button
              className="show-more-projects"
              onClick={() => setVisibleCount((count) => count + 3)}
            >
              展示更多
              <Icon name="down" />
            </button>
          )}
          {projects.length === 0 && <p className="search-empty">没有匹配的项目或需求</p>}
        </nav>
        {!search && (
          <div className="agent-roster">
            <div className="roster-header">
              <span>Agents</span>
            </div>
            {data.agents.map((agent) => (
              <ListItemButton
                component="button"
                key={agent.id}
                aria-label={`与${agent.name}对话`}
                aria-pressed={scope.agentId === agent.id}
                selected={scope.agentId === agent.id}
                onClick={() =>
                  onScope({
                    id: `agent-${agent.id}`,
                    title: agent.name,
                    label: 'Agent 对话',
                    agentId: agent.id,
                  })
                }
              >
                <AgentAvatar
                  agent={{
                    ...agent,
                    color:
                      agent.id === 'alex'
                        ? '#0866ff'
                        : agent.id === 'sam'
                          ? '#08a56d'
                          : agent.color,
                  }}
                  size={20}
                />
                <StatusDot online={agent.online} />
                <span>
                  {agent.name} · {agent.role}
                </span>
              </ListItemButton>
            ))}
          </div>
        )}
      </div>
      <div className="account-footer">
        <Divider />
        <button
          className="account-button"
          aria-label="个人菜单"
          onClick={(e) => onAccount(e.currentTarget)}
        >
          <AgentAvatar size={24} />
          <span>{userName}</span>
          <Icon name="more" />
        </button>
      </div>
    </aside>
  )
}

export function SidebarRail({
  data,
  scope,
  currentProjectId,
  currentRequirementId,
  onScope,
  onHide,
  onAccount,
}: Props) {
  const project = data.projects.find((p) => p.id === currentProjectId)
  const requirement = data.requirements.find((r) => r.id === currentRequirementId)
  const actions = [
    {
      label: '当前工作空间对话',
      title: data.workspace.name,
      icon: 'chat',
      active: scope.id === 'workspace',
      disabled: false,
      action: () => onScope({ id: 'workspace', title: '工作空间对话', label: '工作空间' }),
    },
    {
      label: '当前项目对话',
      title: project?.name ?? '尚未选择项目',
      icon: 'cube',
      active: scope.id === `project-${project?.id}`,
      disabled: !project,
      action: () =>
        project &&
        onScope({
          id: `project-${project.id}`,
          title: project.name,
          label: '当前项目',
          projectId: project.id,
        }),
    },
    {
      label: '当前需求对话',
      title: requirement?.title ?? '此项目暂无需求',
      icon: 'doc',
      active: scope.id === requirement?.id,
      disabled: !requirement,
      action: () =>
        requirement &&
        onScope({
          id: requirement.id,
          title: requirement.title,
          label: '当前需求',
          projectId: requirement.projectId,
          requirementId: requirement.id,
        }),
    },
  ]
  return (
    <aside className="sidebar-rail" aria-label="窄侧栏">
      <Action label="展开侧栏" icon="collapse" onClick={onHide} />
      <nav aria-label="快捷对话">
        {actions.map((item) => (
          <Tooltip key={item.label} title={`${item.label} · ${item.title}`} placement="right">
            <span>
              <IconButton
                aria-label={item.label}
                disabled={item.disabled}
                className={item.active ? 'rail-active' : ''}
                onClick={item.action}
              >
                <Icon name={item.icon} />
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </nav>
      <button
        className="rail-account"
        aria-label="个人菜单"
        onClick={(e) => onAccount(e.currentTarget)}
      >
        <AgentAvatar size={24} />
      </button>
    </aside>
  )
}
