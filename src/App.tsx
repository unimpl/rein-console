import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Menu,
  MenuItem,
  Snackbar,
  TextField,
  useMediaQuery,
} from '@mui/material'
import type { AppData, ChatScope, Project, Task, TaskStatus } from './types'
import { defaultScope, reinService } from './services/reinService'
import { preferencesService } from './services/preferences'
import { Sidebar, SidebarRail } from './components/Sidebar'
import { EntityDialog } from './components/EntityDialog'
import type { EntityEditor } from './components/EntityDialog'
import { MemoryPanel } from './components/MemoryPanel'
import { Chat } from './components/Chat'
import { TaskPanel } from './components/TaskPanel'
import { TaskDetails } from './components/TaskDetails'
import { Settings } from './components/Settings'
import { Login } from './components/Login'
import { Action, AgentAvatar, Icon } from './components/shared'
import { statusLabels } from './constants'
import './App.css'

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [scope, setScope] = useState<ChatScope>(defaultScope)
  const [currentProjectId, setCurrentProjectId] = useState(defaultScope.projectId!)
  const [currentRequirementId, setCurrentRequirementId] = useState<string | undefined>(
    defaultScope.requirementId,
  )
  const [entityEditor, setEntityEditor] = useState<EntityEditor | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(preferencesService.sidebar)
  const [mobileNav, setMobileNav] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'tasks'>('chat')
  const [split, setSplit] = useState(preferencesService.split)
  const [dragging, setDragging] = useState(false)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [detailDefaultWidth, setDetailDefaultWidth] = useState(640)
  const [detailWidthRatio, setDetailWidthRatio] = useState(preferencesService.detailRatio)
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null)
  const [workspaceAnchor, setWorkspaceAnchor] = useState<HTMLElement | null>(null)
  const [settings, setSettings] = useState(false)
  const [logout, setLogout] = useState(false)
  const [loggedIn, setLoggedIn] = useState(true)
  const [preferences, setPreferences] = useState(preferencesService.load)
  const [notice, setNotice] = useState('')
  const [info, setInfo] = useState<'flow' | 'help' | 'profile' | 'members' | null>(null)
  const [userName, setUserName] = useState('Haibin')
  const [nameDraft, setNameDraft] = useState('Haibin')
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const splitRef = useRef<HTMLDivElement>(null)
  const taskOpenerRef = useRef<HTMLElement | null>(null)
  const [lastTaskId, setLastTaskId] = useState('T-24')
  const compact = useMediaQuery('(max-width: 1199px)')
  const mobile = useMediaQuery('(max-width: 899px)')
  const splitValueRef = useRef(split)
  useEffect(() => {
    void reinService.getData().then(setData)
    return reinService.subscribe(setData)
  }, [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (compact) setMobileNav(true)
        else setSidebarVisible(true)
        window.setTimeout(
          () => document.querySelector<HTMLInputElement>('[aria-label="搜索项目和需求"]')?.focus(),
          80,
        )
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [compact])
  function toggleSidebar() {
    if (compact) setMobileNav((v) => !v)
    else {
      setSidebarVisible((v) => !v)
      preferencesService.setSidebar(!sidebarVisible)
    }
  }
  function changeScope(next: ChatScope) {
    if (next.projectId) {
      setCurrentProjectId(next.projectId)
      setCurrentRequirementId(
        next.requirementId ??
          (next.projectId === currentProjectId
            ? currentRequirementId
            : data?.requirements.find((r) => r.projectId === next.projectId)?.id),
      )
    }
    setMobilePanel('chat')
    setScope(next)
    setSelectedTask(null)
    setMobileNav(false)
  }
  function showTask(id: string) {
    taskOpenerRef.current = document.activeElement as HTMLElement
    const titleRight = splitRef.current
      ?.querySelector('.task-panel h2')
      ?.getBoundingClientRect().right
    setDetailDefaultWidth(
      !mobile && titleRight ? window.innerWidth - titleRight : window.innerWidth,
    )
    setLastTaskId(id)
    setSelectedTask(id)
    setExpanded(false)
  }
  function closeTask() {
    setSelectedTask(null)
    requestAnimationFrame(() => taskOpenerRef.current?.focus())
  }
  function adjustSplit(clientX: number) {
    const rect = splitRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = Math.max(
      360 / (rect.width - 1),
      Math.min(1 - 360 / (rect.width - 1), (clientX - rect.left) / (rect.width - 1)),
    )
    setSplit(next)
    splitValueRef.current = next
  }
  async function changeTaskStatus(task: Task, status: TaskStatus) {
    await reinService.updateTask(task.id, {
      status,
      execution: status === 'running' ? 'executing' : status === 'done' ? 'completed' : 'queued',
      statusText: status === 'running' ? '执行中' : status === 'done' ? '已完成' : '待执行',
    })
    setNotice(`任务已移至${statusLabels[status]}（模拟）`)
  }
  const notify = (text: string) => setNotice(text)
  const snackbar = (
    <Snackbar
      open={!!notice}
      autoHideDuration={3500}
      onClose={() => setNotice('')}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="info" onClose={() => setNotice('')} sx={{ fontSize: 12 }}>
        {notice}
      </Alert>
    </Snackbar>
  )
  if (!loggedIn)
    return (
      <>
        <Login
          onLogin={() => {
            setLoggedIn(true)
            notify('已进入 Rein 演示工作空间')
          }}
          notify={notify}
        />
        {snackbar}
      </>
    )
  if (!data)
    return (
      <div className="app-loading">
        <CircularProgress size={22} />
        <span>正在载入 Rein…</span>
      </div>
    )
  const sidebarProps = {
    data,
    scope,
    currentProjectId,
    currentRequirementId,
    onScope: changeScope,
    onHide: toggleSidebar,
    onAccount: setAccountAnchor,
    onWorkspace: setWorkspaceAnchor,
    userName,
    onProject: (project?: Project) => setEntityEditor({ kind: 'project', project }),
    onRequirement: (projectId: string) => setEntityEditor({ kind: 'requirement', projectId }),
  }
  const selectedAgent = data.agents.find((agent) => agent.id === scope.agentId)
  const sidebar = <Sidebar {...sidebarProps} />
  return (
    <div
      className={`app-shell ${dragging ? 'is-resizing' : ''} ${preferences.fontSize.startsWith('14') ? 'font-standard' : ''}`}
      style={
        {
          '--terminal-size': preferences.terminal.includes('13 px') ? '13px' : '12px',
        } as CSSProperties
      }
    >
      {!compact && sidebarVisible ? sidebar : <SidebarRail {...sidebarProps} />}
      <Drawer
        open={compact && mobileNav}
        onClose={() => setMobileNav(false)}
        slotProps={{ paper: { sx: { width: 296, maxWidth: 'calc(100vw - 40px)' } } }}
      >
        {sidebar}
      </Drawer>
      <main className="main-workspace">
        {mobile && (
          <div className="compact-toolbar">
            <Icon name="layers" size={20} />
            <span>Rein</span>
            <span className="spacer" />
            {mobile && (
              <div className="mobile-view-switch">
                <Button
                  variant={mobilePanel === 'chat' ? 'contained' : 'text'}
                  onClick={() => setMobilePanel('chat')}
                >
                  群聊
                </Button>
                <Button
                  variant={mobilePanel === 'tasks' ? 'contained' : 'text'}
                  onClick={() => setMobilePanel('tasks')}
                >
                  {selectedAgent ? 'Memory' : '任务'}
                </Button>
              </div>
            )}
          </div>
        )}
        <div
          className={`split-layout ${mobile ? `mobile-show-${mobilePanel}` : ''}`}
          ref={splitRef}
          style={{
            gridTemplateColumns: mobile
              ? undefined
              : // Keep flexible weights above 1 even after either minimum freezes a track.
                `minmax(360px, ${split * 100}fr) 1px minmax(360px, ${(1 - split) * 100}fr)`,
          }}
        >
          <Chat
            data={data}
            scope={scope}
            onTask={showTask}
            onMembers={() => setInfo('members')}
            notify={notify}
            sendMode={preferences.sendMode}
            userName={userName}
          />
          <div
            className="split-divider"
            role="separator"
            aria-label="调整聊天与任务栏宽度"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split * 100)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault()
                const rect = splitRef.current!.getBoundingClientRect()
                adjustSplit(
                  rect.left + (split + (e.key === 'ArrowRight' ? 0.02 : -0.02)) * (rect.width - 1),
                )
                preferencesService.setSplit(splitValueRef.current)
              }
            }}
            onPointerDown={(e) => {
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              setDragging(true)
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) adjustSplit(e.clientX)
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              setDragging(false)
              preferencesService.setSplit(splitValueRef.current)
            }}
            onPointerCancel={() => setDragging(false)}
            onLostPointerCapture={() => setDragging(false)}
          >
            <span className="split-handle">
              <Icon name="drag" size={14} />
            </span>
          </div>
          {selectedAgent ? (
            <MemoryPanel agent={selectedAgent} />
          ) : (
            <TaskPanel
              data={data}
              scope={scope}
              selectedId={selectedTask ?? lastTaskId}
              onTask={showTask}
              onFlow={() => setInfo('flow')}
              onCreate={(status) => {
                setCreateStatus(status)
                setTaskTitle('')
              }}
              onStatus={changeTaskStatus}
            />
          )}
        </div>
      </main>
      <TaskDetails
        key={selectedTask ?? 'closed'}
        data={data}
        task={data.tasks.find((t) => t.id === selectedTask)}
        expanded={expanded}
        defaultWidth={detailDefaultWidth}
        widthRatio={detailWidthRatio}
        onWidthRatioChange={(ratio) => {
          setDetailWidthRatio(ratio)
          preferencesService.setDetailRatio(ratio)
        }}
        availableLeft={!compact && sidebarVisible ? 296 : 56}
        onExpand={() => setExpanded((v) => !v)}
        onClose={closeTask}
        onStatus={changeTaskStatus}
        notify={notify}
      />
      <Menu
        anchorEl={accountAnchor}
        open={!!accountAnchor}
        onClose={() => setAccountAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            className: 'account-menu',
            sx: {
              width: 264,
              padding: '6px',
              border: '1px solid #e5e8ef',
              borderRadius: '6px',
              boxShadow: '0 6px 18px #1726401f',
              marginTop: compact ? '8px' : '-10px',
            },
          },
        }}
      >
        {[
          {
            label: '个人',
            icon: 'person',
            action: () => {
              setNameDraft(userName)
              setInfo('profile')
            },
          },
          { label: '设置', icon: 'settings', action: () => setSettings(true) },
          { label: '帮助', icon: 'help', action: () => setInfo('help') },
        ].map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => {
              setAccountAnchor(null)
              item.action()
            }}
          >
            <Icon name={item.icon} />
            {item.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAccountAnchor(null)
            setLogout(true)
          }}
        >
          <Icon name="logout" />
          退出登录
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={workspaceAnchor}
        open={!!workspaceAnchor}
        onClose={() => setWorkspaceAnchor(null)}
      >
        <MenuItem
          selected
          onClick={() => {
            setWorkspaceAnchor(null)
            notify('当前工作空间：default')
          }}
        >
          <Icon name="layers" size={20} />
          default
          <Icon name="check" size={12} />
        </MenuItem>
      </Menu>
      <Settings
        open={settings}
        onClose={() => setSettings(false)}
        value={preferences}
        onChange={(next) => {
          setPreferences(next)
          return preferencesService.save(next)
        }}
        notify={notify}
      />
      <Dialog
        open={logout}
        onClose={() => setLogout(false)}
        className="logout-dialog"
        slotProps={{
          paper: { sx: { width: 440, height: 220, maxWidth: 'calc(100vw - 32px)', margin: 2 } },
        }}
      >
        <DialogTitle>退出登录？</DialogTitle>
        <DialogContent>
          <p>确定要退出 Rein 吗？下次使用时需要重新登录。</p>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setLogout(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setLogout(false)
              setSelectedTask(null)
              setSettings(false)
              setMobileNav(false)
              setLoggedIn(false)
            }}
          >
            退出登录
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!info} onClose={() => setInfo(null)} fullWidth maxWidth="sm">
        <DialogTitle className="dialog-title">
          {info === 'flow'
            ? '任务流'
            : info === 'profile'
              ? '个人'
              : info === 'members'
                ? '群聊成员'
                : '帮助'}
          <Action label="关闭对话框" icon="close" onClick={() => setInfo(null)} />
        </DialogTitle>
        <DialogContent>
          {info === 'flow' && (
            <div className="placeholder-state">
              <Icon name="flow" />
              <h3>任务流画布待实现</h3>
              <p>Figma 尚未提供此界面的完整设计。当前保留入口，后续按正式设计接入。</p>
              <Button variant="outlined" onClick={() => setInfo(null)}>
                返回工作空间
              </Button>
            </div>
          )}
          {info === 'members' &&
            data.agents.map((a) => (
              <div className="member-row" key={a.id}>
                <AgentAvatar agent={a} />
                <strong>
                  {a.name} · {a.role}
                </strong>
                <span>{a.cli} · 模拟成员</span>
              </div>
            ))}
          {info === 'profile' && (
            <form
              className="profile-form"
              onSubmit={(e) => {
                e.preventDefault()
                setUserName(nameDraft.trim())
                setInfo(null)
                notify('个人资料已更新（本次演示）')
              }}
            >
              <AgentAvatar size={36} />
              <TextField
                label="显示名称"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                required
              />
              <p className="muted">演示用户 · default 工作空间</p>
              <Button type="submit" variant="contained" disabled={!nameDraft.trim()}>
                保存
              </Button>
            </form>
          )}
          {info === 'help' && (
            <div className="help-content">
              <h3>Rein 工作空间</h3>
              <p>
                在左侧切换项目与需求，群聊和任务栏会展示对应范围。拖动中间分隔线调整宽度，也可聚焦分隔线后使用左右方向键。
              </p>
              <p>点击任务打开详情，切换活动、CLI 和结果；接管输入后可以向模拟终端发送命令。</p>
              <p>Enter 发送消息，Shift + Enter 换行。配置入口位于个人头像菜单中。</p>
              <Alert severity="info">当前所有登录、模型连接、任务和终端输出均为前端模拟。</Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={createStatus !== null}
        onClose={() => setCreateStatus(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle className="dialog-title">
          新建任务
          <Action label="关闭新建任务" icon="close" onClick={() => setCreateStatus(null)} />
        </DialogTitle>
        <DialogContent>
          <form
            className="create-task-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (createStatus && taskTitle.trim()) {
                await reinService.createTask(
                  scope.requirementId ??
                    data.requirements.find((r) => r.projectId === scope.projectId)?.id ??
                    'gateway',
                  taskTitle.trim(),
                  createStatus,
                )
                setCreateStatus(null)
                notify('模拟任务已创建')
              }
            }}
          >
            <p className="muted">
              {scope.title} · {createStatus && statusLabels[createStatus]}
            </p>
            <TextField
              label="任务名称"
              autoFocus
              required
              fullWidth
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <Button type="submit" variant="contained" disabled={!taskTitle.trim()}>
              创建任务
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {entityEditor && (
        <EntityDialog
          key={`${entityEditor.kind}-${entityEditor.project?.id ?? entityEditor.projectId ?? 'new'}`}
          editor={entityEditor}
          onClose={() => setEntityEditor(null)}
          onSaved={(result) => {
            const editing = !!entityEditor.project
            setEntityEditor(null)
            if (result.kind === 'requirement')
              changeScope({
                id: result.id,
                title: result.name,
                label: '当前需求',
                projectId: result.projectId,
                requirementId: result.id,
              })
            else if (!editing || scope.id === `project-${result.id}`)
              changeScope({
                id: `project-${result.id}`,
                title: result.name,
                label: '当前项目',
                projectId: result.id,
              })
            notify(editing ? '项目已更新' : result.kind === 'project' ? '项目已创建' : '需求已创建')
          }}
        />
      )}
      {snackbar}
    </div>
  )
}
