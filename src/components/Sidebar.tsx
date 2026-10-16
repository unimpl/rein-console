import { useState } from 'react'
import { Divider, ListItemButton, OutlinedInput } from '@mui/material'
import type { AppData, ChatScope, TaskStatus } from '../types'
import { Action, AgentAvatar, Icon, StatusDot } from './shared'
import { statusLabels } from '../constants'

interface Props {
  data: AppData
  scope: ChatScope
  onScope: (scope: ChatScope) => void
  onHide: () => void
  onAccount: (el: HTMLElement) => void
  onAgents: () => void
  onWorkspace: (el: HTMLElement) => void
  userName: string
}
export function Sidebar({
  data,
  scope,
  onScope,
  onHide,
  onAccount,
  onAgents,
  onWorkspace,
  userName,
}: Props) {
  const [search, setSearch] = useState('')
  const matches = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase())
  return (
    <aside className="sidebar" aria-label="工作空间导航">
      <div className="workspace-header">
        <button className="workspace-select" onClick={(e) => onWorkspace(e.currentTarget)}>
          <Icon name="layers" size={20} />
          <span>{data.workspace.name}</span>
          <Icon name="down" size={14} />
        </button>
        <Action label="隐藏侧栏" icon="collapse" onClick={onHide} />
      </div>
      <div className="sidebar-scroll">
        <OutlinedInput
          className="sidebar-search"
          fullWidth
          placeholder="搜索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startAdornment={<Icon name="search" size={16} />}
          endAdornment={<span className="shortcut">⌘ K</span>}
          inputProps={{ 'aria-label': '搜索项目和需求' }}
        />
        <nav className="navigation">
          {matches('工作空间对话') && (
            <ListItemButton
              selected={scope.id === 'workspace'}
              onClick={() => onScope({ id: 'workspace', title: '工作空间对话', label: '工作空间' })}
            >
              <Icon name="chat" />
              工作空间对话
            </ListItemButton>
          )}
          {matches('Agent 管理') && (
            <ListItemButton onClick={onAgents}>
              <Icon name="agents" />
              Agent 管理
            </ListItemButton>
          )}
          <Divider className="nav-divider" />
          <div className="nav-label">项目</div>
          {data.projects.map((project) => {
            const requirements = data.requirements.filter((r) => r.projectId === project.id)
            if (!matches(project.name) && !requirements.some((r) => matches(r.title))) return null
            return (
              <div className="project-tree" key={project.id}>
                <ListItemButton
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
                  <Icon name="cube" />
                  {project.name}
                </ListItemButton>
                {(project.id === 'gatewaykit' || scope.projectId === project.id) && (
                  <>
                    <ListItemButton
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
                      项目对话
                    </ListItemButton>
                    {requirements
                      .filter((r) => matches(r.title) || matches(project.name))
                      .map((requirement) => (
                        <div key={requirement.id}>
                          <ListItemButton
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
                            {requirement.title}
                          </ListItemButton>
                          {requirement.id === 'gateway' && (
                            <div className="status-tree">
                              {(Object.keys(statusLabels) as TaskStatus[]).map((status) => (
                                <ListItemButton
                                  key={status}
                                  className="tree-status"
                                  selected={scope.id === `${requirement.id}-${status}`}
                                  onClick={() =>
                                    onScope({
                                      id: `${requirement.id}-${status}`,
                                      title: `${requirement.title} · ${statusLabels[status]}`,
                                      label: statusLabels[status],
                                      projectId: project.id,
                                      requirementId: requirement.id,
                                      status,
                                    })
                                  }
                                >
                                  <StatusDot status={status} />
                                  <span>{statusLabels[status]}</span>
                                  <span className="count">
                                    {
                                      data.tasks.filter(
                                        (t) =>
                                          t.requirementId === requirement.id && t.status === status,
                                      ).length
                                    }
                                  </span>
                                </ListItemButton>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </>
                )}
              </div>
            )
          })}
        </nav>
        {!search && (
          <div className="agent-roster">
            <div className="roster-header">
              <span>Agents</span>
              <Action label="添加 Agent" icon="plus" onClick={onAgents} />
            </div>
            {data.agents.map((agent) => (
              <ListItemButton key={agent.id} onClick={onAgents}>
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
        {search &&
          !data.projects.some((p) => matches(p.name)) &&
          !data.requirements.some((r) => matches(r.title)) && (
            <p className="search-empty">没有匹配的项目或需求</p>
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
