import { useState } from 'react'
import { Button, ButtonBase, Menu, MenuItem, Paper } from '@mui/material'
import type { AppData, ChatScope, Task, TaskStatus } from '../types'
import { tasksInScope } from '../services/reinService'
import { Action, AgentAvatar, Icon, StateIcon, StatusDot } from './shared'
import { statusLabels } from '../constants'

interface Props {
  data: AppData
  scope: ChatScope
  selectedId: string | null
  onTask: (id: string) => void
  onFlow: () => void
  onCreate: (status: TaskStatus) => void
  onStatus: (task: Task, status: TaskStatus) => void
}
export function TaskPanel({ data, scope, selectedId, onTask, onFlow, onCreate, onStatus }: Props) {
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const [filter, setFilter] = useState('all')
  const [taskMenu, setTaskMenu] = useState<{ el: HTMLElement; task: Task } | null>(null)
  const tasks = tasksInScope(data, scope).filter(
    (t) =>
      filter === 'all' || (filter === 'waiting' ? t.execution === 'waiting' : t.agentId === filter),
  )
  return (
    <section className="task-panel" aria-label="任务栏">
      <header className="panel-header">
        <Icon name="checklist" size={20} />
        <h2>Todo</h2>
        <span className="spacer" />
        <Button variant="outlined" startIcon={<Icon name="flow" />} onClick={onFlow}>
          任务流
        </Button>
        <Action
          label="筛选任务"
          icon="filter"
          className={filter !== 'all' ? 'active-action' : ''}
          onClick={(e) => setFilterAnchor(e.currentTarget)}
        />
        <Action label="新建任务" onClick={() => onCreate('todo')} />
      </header>
      <div className="task-groups">
        {(Object.keys(statusLabels) as TaskStatus[]).map((status) => (
          <section key={status} className="task-group" aria-label={statusLabels[status]}>
            <div className="group-header">
              <StatusDot status={status} />
              <h3>{statusLabels[status]}</h3>
              <small>{tasks.filter((t) => t.status === status).length}</small>
              <span className="spacer" />
              <Action
                label={`在${statusLabels[status]}中新建任务`}
                icon="plus"
                onClick={() => onCreate(status)}
              />
              <Action
                label={`${statusLabels[status]}分组说明`}
                onClick={(e) => setFilterAnchor(e.currentTarget)}
              />
            </div>
            <div className="group-cards">
              {tasks
                .filter((t) => t.status === status)
                .map((task) => {
                  const agent = data.agents.find((a) => a.id === task.agentId)
                  return (
                    <Paper
                      variant="outlined"
                      className={`task-card ${selectedId === task.id ? 'selected' : ''}`}
                      key={task.id}
                    >
                      <div className="task-card-meta">
                        <span>#{task.id}</span>
                        <Action
                          label={`${task.id}任务操作`}
                          onClick={(e) => setTaskMenu({ el: e.currentTarget, task })}
                        />
                      </div>
                      <ButtonBase
                        className="task-card-main"
                        aria-label={`打开任务 ${task.title}`}
                        onClick={() => onTask(task.id)}
                      >
                        <strong>{task.title}</strong>
                        <div className="task-assignee">
                          <AgentAvatar agent={agent} size={18} />
                          <span>
                            {agent?.name}
                            {task.reviewerId ? ' / Robin' : ` · ${agent?.role}`}
                          </span>
                        </div>
                        <div className={`task-state ${task.execution}`}>
                          <StateIcon state={task.execution} />
                          <span>{task.statusText}</span>
                        </div>
                      </ButtonBase>
                    </Paper>
                  )
                })}
              {!tasks.some((t) => t.status === status) && <p className="group-empty">暂无任务</p>}
            </div>
          </section>
        ))}
      </div>
      <Menu anchorEl={filterAnchor} open={!!filterAnchor} onClose={() => setFilterAnchor(null)}>
        {[
          { id: 'all', label: '全部任务' },
          { id: 'waiting', label: '等待回复' },
          ...data.agents.map((a) => ({ id: a.id, label: a.name })),
        ].map((item) => (
          <MenuItem
            selected={filter === item.id}
            key={item.id}
            onClick={() => {
              setFilter(item.id)
              setFilterAnchor(null)
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={taskMenu?.el} open={!!taskMenu} onClose={() => setTaskMenu(null)}>
        {(Object.keys(statusLabels) as TaskStatus[]).map((status) => (
          <MenuItem
            key={status}
            onClick={() => {
              if (taskMenu) onStatus(taskMenu.task, status)
              setTaskMenu(null)
            }}
          >
            移至{statusLabels[status]}
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            if (taskMenu) onTask(taskMenu.task.id)
            setTaskMenu(null)
          }}
        >
          查看任务详情
        </MenuItem>
      </Menu>
    </section>
  )
}
