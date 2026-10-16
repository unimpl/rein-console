import { useEffect, useRef, useState } from 'react'
import { Button, InputBase, Menu, MenuItem, Paper } from '@mui/material'
import type { AppData, ChatScope } from '../types'
import { reinService } from '../services/reinService'
import { Action, AgentAvatar, Icon } from './shared'

interface Props {
  data: AppData
  scope: ChatScope
  onTask: (id: string) => void
  onMembers: () => void
  notify: (message: string) => void
  sendMode: string
  userName: string
}
export function Chat({ data, scope, onTask, onMembers, notify, sendMode, userName }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const draft = drafts[scope.id] ?? ''
  const setDraft = (value: string) => setDrafts((prev) => ({ ...prev, [scope.id]: value }))
  const [memberAnchor, setMemberAnchor] = useState<HTMLElement | null>(null)
  const messages = data.messages.filter((m) => m.scopeId === scope.id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [attachment, setAttachment] = useState('')
  const [sending, setSending] = useState(false)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, scope.id])
  async function send() {
    if ((!draft.trim() && !attachment) || sending) return
    setSending(true)
    try {
      await reinService.sendMessage(
        scope.id,
        `${draft}${attachment ? `\n[附件：${attachment}，仅本地演示]` : ''}`,
      )
      setDraft('')
      setAttachment('')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }
  return (
    <section className="chat-panel" aria-label="群聊">
      <header className="panel-header chat-header">
        <Icon name="people" size={24} />
        <div className="chat-heading">
          <h1>{scope.title}</h1>
          <span>群聊</span>
        </div>
        <div className="header-members">
          {data.agents.map((agent) => (
            <AgentAvatar key={agent.id} agent={agent} />
          ))}
        </div>
        <Action label="查看群聊成员" icon="plus" onClick={onMembers} />
        <Action
          label="聊天范围说明"
          onClick={() => notify(`当前聊天范围：${scope.title}。消息仅发送到此范围。`)}
        />
      </header>
      <div
        className="messages"
        ref={scrollRef}
        role="log"
        aria-label={`${scope.title}的聊天记录`}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="empty-message">
            <Icon name="chat" />
            <p>在{scope.title}中开始对话</p>
            <span>消息仅对当前范围可见。</span>
          </div>
        )}
        {messages.map((message) => {
          const own = message.authorId === 'me'
          const agent = data.agents.find((a) => a.id === message.authorId)
          return (
            <article
              className={`message ${own ? 'own' : 'agent-message'} ${message.taskIds ? 'with-tasks' : ''}`}
              key={message.id}
            >
              {!own && <AgentAvatar agent={agent} />}
              <div className="message-content">
                <div className="message-author">
                  {own ? (
                    <span>
                      {userName}　{message.time}
                    </span>
                  ) : (
                    <>
                      <strong>
                        {agent?.name} · {agent?.role}
                      </strong>
                      <time>{message.time}</time>
                    </>
                  )}
                </div>
                <div className="message-bubble-row">
                  <Paper
                    elevation={0}
                    className={`message-bubble ${message.execution ? 'with-execution' : ''}`}
                  >
                    <span>{message.content}</span>
                    {message.execution && (
                      <span className={`message-state ${message.execution}`}>
                        <Icon
                          name={message.execution === 'waiting' ? 'chatWaiting' : 'chatSpinner'}
                          size={message.execution === 'waiting' ? 14 : 12}
                          spin={message.execution === 'executing'}
                        />
                        {message.execution === 'waiting' && '等待回复'}
                      </span>
                    )}
                  </Paper>
                  {own && <AgentAvatar />}
                </div>
                {message.taskIds && (
                  <Paper variant="outlined" className="message-task-table">
                    {message.taskIds.map((id) => {
                      const task = data.tasks.find((t) => t.id === id)
                      return (
                        task && (
                          <button className="assignment-row" key={id} onClick={() => onTask(id)}>
                            <Icon name="doc" />
                            <span>{task.id === 'T-24' ? '修复间歇 503' : task.title}</span>
                            <small>
                              {data.agents.find((a) => a.id === task.agentId)?.name}
                              {task.reviewerId ? ' / Robin' : ''}
                            </small>
                          </button>
                        )
                      )
                    })}
                  </Paper>
                )}
              </div>
            </article>
          )
        })}
      </div>
      <div className="composer-dock">
        <Paper
          component="form"
          variant="outlined"
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <InputBase
            inputRef={inputRef}
            multiline
            maxRows={5}
            fullWidth
            placeholder="发送消息，@成员或分派任务…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputProps={{ 'aria-label': '发送消息' }}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                !e.shiftKey &&
                (sendMode === 'Enter 发送' || e.ctrlKey || e.metaKey)
              ) {
                e.preventDefault()
                void send()
              }
            }}
          />
          {attachment && (
            <div className="attachment-chip">
              {attachment}
              <Action label="移除附件" icon="close" onClick={() => setAttachment('')} />
            </div>
          )}
          <div className="composer-actions">
            <Action label="提及成员" icon="at" onClick={(e) => setMemberAnchor(e.currentTarget)} />
            <Action
              label="添加本地演示附件"
              icon="attach"
              onClick={() => fileRef.current?.click()}
            />
            <Button
              variant="outlined"
              startIcon={<Icon name="doc" />}
              onClick={() => notify(`消息范围：${scope.title}`)}
            >
              {scope.label}
            </Button>
            <span className="spacer" />
            <Button
              type="submit"
              variant="contained"
              aria-label="发送消息按钮"
              disabled={sending || (!draft.trim() && !attachment)}
              className="send-button"
            >
              <Icon name="send" />
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => {
              setAttachment(e.target.files?.[0]?.name ?? '')
              e.target.value = ''
            }}
          />
        </Paper>
      </div>
      <Menu anchorEl={memberAnchor} open={!!memberAnchor} onClose={() => setMemberAnchor(null)}>
        {data.agents.map((agent) => (
          <MenuItem
            key={agent.id}
            onClick={() => {
              setDraft(`${draft}@${agent.name} `)
              setMemberAnchor(null)
              inputRef.current?.focus()
            }}
          >
            <AgentAvatar agent={agent} size={18} />
            {agent.name} · {agent.role}
          </MenuItem>
        ))}
      </Menu>
    </section>
  )
}
