import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, InputBase, Paper, TextField } from '@mui/material'
import type { HubAgent, HubEvent, HubRun, RunRecord, RunUpdate } from '../services/hubService'
import { decodeJson, hubService, runStateLabel, terminalRun } from '../services/hubService'
import { AgentAvatar, Icon } from './shared'

type LoadedRun = RunUpdate
type Interaction = NonNullable<HubEvent['interaction']>
function savedSession(agentId: string) {
  try {
    return localStorage.getItem(`rein.session.${agentId}`) || ''
  } catch {
    return ''
  }
}
function persistSession(agentId: string, session: string) {
  try {
    localStorage.setItem(`rein.session.${agentId}`, session)
  } catch {
    /* 当前页仍保留会话。 */
  }
}

export function HubAgentChat({
  agent,
  userName,
  sendMode,
}: {
  agent: HubAgent
  userName: string
  sendMode: string
}) {
  const [records, setRecords] = useState<LoadedRun[]>([])
  const cache = useRef(new Map<string, LoadedRun>())
  const [session, setSession] = useState(() => savedSession(agent.id))
  const sessionRef = useRef(session)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [sessions, setSessions] = useState<{ id: string; prompt: string }[]>([])
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState<string>()
  const sendRequest = useRef<{ key: string; id: string } | null>(null)
  const cancelRequest = useRef(new Map<string, string>())
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const freshSession = useRef(false)
  const loadHistory = useRef<(session: string, older: boolean) => Promise<void>>(async () => {})
  const cursors = useRef(new Map<string, string>())
  const cancelHistory = useRef<() => void>(() => {})
  const followBottom = useRef(true)
  const restoreScroll = useRef<{ key: string; top: number } | null>(null)
  function publishRecords() {
    setRecords(
      [...cache.current.values()].sort(
        (a, b) => a.created_at.localeCompare(b.created_at) || a.run.id.localeCompare(b.run.id),
      ),
    )
  }
  function merge(record: RunUpdate) {
    const old = cache.current.get(record.run.id)
    const newer = !old || BigInt(record.version) >= BigInt(old.version)
    const sameAttempt = old?.run.attemptId === record.run.attemptId
    if (old && !sameAttempt && !newer) return
    const events = new Map((sameAttempt ? old!.events : []).map((event) => [event.sequence, event]))
    for (const event of record.events) events.set(event.sequence, event)
    cache.current.set(record.run.id, {
      ...(newer ? record : old!),
      events: [...events.values()].sort((a, b) =>
        BigInt(a.sequence) < BigInt(b.sequence) ? -1 : 1,
      ),
    })
  }
  function chooseSession(value: string, fetchHistory = true) {
    sessionRef.current = value
    setSession(value)
    persistSession(agent.id, value)
    followBottom.current = true
    setHasMore(!!cursors.current.get(value))
    if (fetchHistory) {
      if (value) void loadHistory.current(value, false)
      else cancelHistory.current()
    }
  }
  useEffect(() => {
    let disposed = false
    let source: EventSource | undefined
    let historyController: AbortController | undefined
    let requestNumber = 0
    let fetchingOlder = false
    let streamCursor = ''
    cancelHistory.current = () => {
      historyController?.abort()
      requestNumber++
      fetchingOlder = false
      setLoading(false)
      setLoadingOlder(false)
    }
    function connect(cursor: string) {
      source?.close()
      streamCursor = cursor
      const connection = hubService.stream(agent.id, cursor)
      source = connection
      connection.onopen = () => {
        if (!disposed && source === connection) setPollError('')
      }
      connection.onerror = () => {
        if (!disposed && source === connection)
          setPollError('实时连接已断开，正在重连；已有记录仍可查看。')
      }
      connection.addEventListener('update', (message) => {
        if (disposed || source !== connection) return
        try {
          const record = JSON.parse(message.data) as RunUpdate
          merge(record)
          setSessions((previous) =>
            previous.some((item) => item.id === record.run.sessionId)
              ? previous
              : [{ id: record.run.sessionId, prompt: record.prompt }, ...previous],
          )
          publishRecords()
        } catch {
          source?.close()
          source = undefined
          setPollError('Hub 实时事件无效，请重试加载。')
        }
      })
      connection.addEventListener('checkpoint', (message) => {
        if (!disposed && source === connection) streamCursor = message.lastEventId
      })
      connection.addEventListener('reset', () => {
        if (disposed || source !== connection) return
        source?.close()
        source = undefined
        streamCursor = ''
        cache.current.clear()
        cursors.current.clear()
        void loadHistory.current(sessionRef.current, false)
      })
    }
    loadHistory.current = async (requestedSession, older) => {
      const before = older ? cursors.current.get(requestedSession) || '' : ''
      if (older && (fetchingOlder || !before)) return
      historyController?.abort()
      const controller = new AbortController()
      historyController = controller
      const currentRequest = ++requestNumber
      fetchingOlder = older
      if (older) setLoadingOlder(true)
      else {
        setLoading(true)
        setLoadingOlder(false)
      }
      try {
        const page = await hubService.history(agent.id, requestedSession, before, controller.signal)
        if (disposed || currentRequest !== requestNumber) return
        if (older && log.current) {
          const top = log.current.getBoundingClientRect().top
          const anchor = [...log.current.querySelectorAll<HTMLElement>('[data-run-anchor]')].find(
            (item) => item.getBoundingClientRect().bottom > top,
          )
          if (anchor)
            restoreScroll.current = {
              key: anchor.dataset.runAnchor!,
              top: anchor.getBoundingClientRect().top,
            }
        }
        for (const record of page.runs) merge(record)
        setSessions((previous) => [
          ...page.sessions,
          ...previous.filter((item) => !page.sessions.some((entry) => entry.id === item.id)),
        ])
        cursors.current.set(page.session_id, page.next_cursor)
        if (!freshSession.current || requestedSession) {
          sessionRef.current = page.session_id
          setSession(page.session_id)
          persistSession(agent.id, page.session_id)
          setHasMore(!!page.next_cursor)
        }
        publishRecords()
        setPollError('')
        if ((!source || source.readyState === EventSource.CLOSED) && !document.hidden)
          connect(page.stream_cursor)
        else if (!streamCursor) streamCursor = page.stream_cursor
      } catch (failure) {
        if (!disposed && !controller.signal.aborted)
          setPollError(failure instanceof Error ? failure.message : '读取对话记录失败')
      } finally {
        if (!disposed && currentRequest === requestNumber) {
          fetchingOlder = false
          setLoading(false)
          setLoadingOlder(false)
        }
      }
    }
    function visibility() {
      if (document.hidden) {
        source?.close()
        source = undefined
      } else if (streamCursor) connect(streamCursor)
      else void loadHistory.current(sessionRef.current, false)
    }
    document.addEventListener('visibilitychange', visibility)
    void loadHistory.current(sessionRef.current, false)
    return () => {
      disposed = true
      historyController?.abort()
      source?.close()
      document.removeEventListener('visibilitychange', visibility)
      loadHistory.current = async () => {}
      cancelHistory.current = () => {}
    }
  }, [agent.id])
  const visible = records.filter((record) => record.run.sessionId === session)
  const active = visible.find((record) => !terminalRun(record.run))
  useLayoutEffect(() => {
    const panel = log.current
    if (!panel) return
    if (restoreScroll.current) {
      const anchor = panel.querySelector<HTMLElement>(
        `[data-run-anchor="${CSS.escape(restoreScroll.current.key)}"]`,
      )
      if (anchor) panel.scrollTop += anchor.getBoundingClientRect().top - restoreScroll.current.top
      restoreScroll.current = null
    } else if (followBottom.current) panel.scrollTop = panel.scrollHeight
  }, [records, session])
  async function send() {
    if (!draft.trim() || loading || sending || active || !agent.online) return
    if (new TextEncoder().encode(draft).length > 48 * 1024) {
      setError('消息不能超过 48 KiB，请缩短后重试。')
      return
    }
    const key = `${session}:${draft}`
    if (sendRequest.current?.key !== key) sendRequest.current = { key, id: crypto.randomUUID() }
    setSending(true)
    setError('')
    try {
      const response = await hubService.create(
        agent.id,
        session,
        draft.trim(),
        sendRequest.current.id,
      )
      const record = cache.current.get(response.run.id) || {
        version: '0',
        run: response.run,
        prompt: draft.trim(),
        created_at: new Date().toISOString(),
        events: [],
      }
      cache.current.set(response.run.id, record)
      setRecords((previous) => [
        ...previous.filter((item) => item.run.id !== response.run.id),
        record,
      ])
      chooseSession(response.run.sessionId, false)
      freshSession.current = false
      setDraft('')
      sendRequest.current = null
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '发送失败，消息已保留，请重试。')
    } finally {
      setSending(false)
      input.current?.focus()
    }
  }
  async function cancel(run: HubRun) {
    let command = cancelRequest.current.get(run.id)
    if (!command) {
      command = crypto.randomUUID()
      cancelRequest.current.set(run.id, command)
    }
    setCancelling(run.id)
    try {
      await hubService.cancel(run, command)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '取消请求失败，请重试。')
    } finally {
      setCancelling(undefined)
    }
  }
  return (
    <section className="chat-panel" aria-label="Agent 对话">
      <header className="panel-header chat-header">
        <AgentAvatar agent={agent} size={24} />
        <div className="chat-heading">
          <h1>{agent.name}</h1>
          <span>
            {agent.backend === 'native' ? `${agent.cli} · 原生` : 'A2A'} ·{' '}
            {agent.disabled ? 'Agent 已下线' : agent.online ? '已连接' : 'Daemon 离线'}
          </span>
        </div>
        <span className="spacer" />
        <Button
          size="small"
          onClick={() => {
            freshSession.current = true
            chooseSession('')
            setDraft('')
          }}
        >
          新对话
        </Button>
      </header>
      <div className="hub-session-bar">
        <label htmlFor={`session-${agent.id}`}>会话</label>
        <select
          id={`session-${agent.id}`}
          value={session}
          onChange={(event) => {
            freshSession.current = !event.target.value
            chooseSession(event.target.value)
          }}
        >
          <option value="">新会话</option>
          {sessions.map((record) => (
            <option key={record.id} value={record.id}>
              {record.prompt.slice(0, 48)}
            </option>
          ))}
        </select>
      </div>
      {(error || pollError) && (
        <Alert
          severity="error"
          className="hub-alert"
          action={
            <Button
              onClick={() => {
                void loadHistory.current(sessionRef.current, false)
              }}
            >
              重试
            </Button>
          }
        >
          {error || pollError}
        </Alert>
      )}
      {!agent.online && (
        <Alert severity="warning" className="hub-alert">
          {agent.disabled
            ? '此 Agent 已下线，历史记录仍可查看。通过 rein up 重新上线后可继续对话。'
            : 'Daemon 当前离线。执行记录仍可查看，连接恢复后可继续对话。'}
        </Alert>
      )}
      <div
        className="messages"
        ref={log}
        role="log"
        aria-label={`${agent.name}的聊天记录`}
        aria-live="polite"
        aria-busy={loading}
        onScroll={(event) => {
          const panel = event.currentTarget
          followBottom.current = panel.scrollHeight - panel.clientHeight - panel.scrollTop < 64
          if (panel.scrollTop < 40 && hasMore && !loading && !loadingOlder)
            void loadHistory.current(sessionRef.current, true)
        }}
      >
        {hasMore && (
          <Button
            size="small"
            disabled={loading || loadingOlder}
            onClick={() => {
              void loadHistory.current(sessionRef.current, true)
            }}
          >
            {loadingOlder ? '正在加载更早记录…' : '加载更早记录'}
          </Button>
        )}
        {!visible.length && (
          <div className="empty-message">
            <Icon name="chat" />
            <p>{loading ? '正在读取执行记录…' : `与 ${agent.name} 开始对话`}</p>
            <span>消息会交给已注册的 Agent 执行。</span>
          </div>
        )}
        {visible.map((record) => (
          <RunMessages key={record.run.id} record={record} agent={agent} userName={userName} />
        ))}
      </div>
      <div className="composer-dock">
        {active && (
          <div className="hub-run-status" role="status">
            <span>
              {runStateLabel[active.run.state] || active.run.state}
              {active.run.cancelRequested ? ' · 已请求取消，等待执行停止' : ''}
            </span>
            <Button
              size="small"
              color="error"
              disabled={cancelling === active.run.id || active.run.cancelRequested}
              onClick={() => {
                void cancel(active.run)
              }}
            >
              停止执行
            </Button>
          </div>
        )}
        <Paper
          component="form"
          variant="outlined"
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          <InputBase
            inputRef={input}
            multiline
            maxRows={5}
            fullWidth
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={active ? '执行结束后可继续发送；草稿会保留' : `发送给 ${agent.name}…`}
            inputProps={{ 'aria-label': '发送消息' }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                !event.shiftKey &&
                (sendMode === 'Enter 发送' || event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault()
                void send()
              }
            }}
          />
          <div className="composer-actions">
            <span className="hub-connection-note">
              {agent.backend === 'native' ? '原生 Agent' : 'A2A Agent'}
            </span>
            <span className="spacer" />
            <Button
              type="submit"
              variant="contained"
              aria-label="发送消息按钮"
              disabled={loading || sending || !!active || !agent.online || !draft.trim()}
              className="send-button"
            >
              <Icon name="send" />
            </Button>
          </div>
        </Paper>
      </div>
    </section>
  )
}

function RunMessages({
  record,
  agent,
  userName,
}: {
  record: LoadedRun
  agent: HubAgent
  userName: string
}) {
  const text = new Map<string, { text: string; reasoning: boolean }>()
  const tools = new Map<string, NonNullable<HubEvent['tool']>>()
  const errors: string[] = []
  let interaction: Interaction | undefined
  for (const event of record.events) {
    if (event.text) {
      const item = event.text
      const key = `${item.reasoning ? 'reasoning:' : ''}${item.itemId}`
      text.set(key, {
        text: item.complete ? item.text : (text.get(key)?.text || '') + item.text,
        reasoning: item.reasoning,
      })
    }
    if (event.tool) {
      const previous = tools.get(event.tool.callId)
      tools.set(event.tool.callId, {
        ...previous,
        ...event.tool,
        inputJson: event.tool.inputJson || previous?.inputJson || '',
        outputJson: event.tool.outputJson || previous?.outputJson || '',
      })
    }
    if (event.interaction) interaction = event.interaction
    if (event.error) errors.push(event.error.message)
  }
  const waiting = ['RUN_STATE_WAITING_APPROVAL', 'RUN_STATE_WAITING_INPUT'].includes(
    record.run.state,
  )
  const when = new Date(record.created_at).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <>
      <article className="message own" data-run-anchor={`${record.run.id}-user`}>
        <div className="message-content">
          <div className="message-author">
            <span>
              {userName}　{when}
            </span>
          </div>
          <div className="message-bubble-row">
            <Paper elevation={0} className="message-bubble">
              <span>{record.prompt}</span>
            </Paper>
            <AgentAvatar />
          </div>
        </div>
      </article>
      <article className="message agent-message" data-run-anchor={`${record.run.id}-agent`}>
        <AgentAvatar agent={agent} />
        <div className="message-content">
          <div className="message-author">
            <strong>{agent.name}</strong>
            <span className="hub-state-label">
              {runStateLabel[record.run.state] || record.run.state}
            </span>
          </div>
          {Array.from(text, ([id, item]) =>
            item.reasoning ? (
              <details className="hub-reasoning" key={id}>
                <summary>思考摘要</summary>
                <p>{item.text}</p>
              </details>
            ) : (
              <Paper key={id} elevation={0} className="message-bubble">
                <span>{item.text}</span>
              </Paper>
            ),
          )}
          {Array.from(tools, ([id, tool]) => (
            <details className="hub-tool" key={id}>
              <summary>
                {tool.name} · {tool.complete ? (tool.isError ? '失败' : '完成') : '执行中'}
              </summary>
              <strong>参数</strong>
              <pre>{JSON.stringify(decodeJson(tool.inputJson), null, 2)}</pre>
              <strong>结果</strong>
              <pre>{JSON.stringify(decodeJson(tool.outputJson), null, 2)}</pre>
            </details>
          ))}
          {!text.size && !tools.size && !errors.length && !waiting && (
            <span className="hub-placeholder">
              {terminalRun(record.run) ? runStateLabel[record.run.state] : '等待 Agent 输出…'}
            </span>
          )}
          {errors.map((error, index) => (
            <Alert severity="error" key={index}>
              {error}
            </Alert>
          ))}
          {waiting && interaction && (
            <InteractionForm
              key={`${record.run.attemptId}:${interaction.interactionId}`}
              run={record.run}
              interaction={interaction}
              acknowledgments={record.command_acks || []}
            />
          )}
          <details className="hub-run-reference">
            <summary>执行信息</summary>
            <dl>
              <dt>Run</dt>
              <dd>{record.run.id}</dd>
              <dt>Attempt</dt>
              <dd>{record.run.attemptId || '待领取'}</dd>
              <dt>Session</dt>
              <dd>{record.run.sessionId}</dd>
            </dl>
          </details>
        </div>
      </article>
    </>
  )
}

function InteractionForm({
  run,
  interaction,
  acknowledgments,
}: {
  run: HubRun
  interaction: Interaction
  acknowledgments: NonNullable<RunRecord['command_acks']>
}) {
  const params = decodeJson<{
    method?: string
    title?: string
    message?: string
    options?: string[]
    questions?: { id: string; question: string; header?: string }[]
  }>(interaction.parametersJson)
  const [value, setValue] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState<string>()
  const request = useRef<{ body: string; id: string } | null>(null)
  const rejected = acknowledgments.find(
    (ack) => ack.commandId === submitted && ack.state === 'COMMAND_ACK_STATE_REJECTED',
  )
  async function reply(response: unknown) {
    const body = JSON.stringify(response)
    if (request.current?.body !== body || rejected)
      request.current = { body, id: crypto.randomUUID() }
    setSending(true)
    setError('')
    try {
      await hubService.reply(run, interaction.interactionId, response, request.current!.id)
      setSubmitted(request.current!.id)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '回复失败，请重试。')
    } finally {
      setSending(false)
    }
  }
  const uncertain = acknowledgments.some(
    (ack) => ack.commandId === submitted && ack.errorCode === 'delivery_unknown',
  )
  const disabled = sending || (!!submitted && !rejected)
  const confirm = interaction.method === 'extension_ui_request' && params.method === 'confirm'
  const questions =
    interaction.method === 'item/tool/requestUserInput' ? params.questions : undefined
  return (
    <Paper variant="outlined" className="hub-interaction" aria-label="Agent 交互请求">
      <h3>{interaction.approvalRequired ? 'Agent 请求审批' : params.title || 'Agent 等待回复'}</h3>
      {params.message && <p>{params.message}</p>}
      {(error || rejected) && (
        <Alert severity="error">{error || 'Agent 拒绝了该回复。请检查内容后重试。'}</Alert>
      )}
      {submitted && !rejected && (
        <p role="status">
          {uncertain
            ? '回复的投递结果未知，请等待状态更新或停止执行，勿重复提交。'
            : '回复已提交，等待 Agent 继续执行。'}
        </p>
      )}
      {interaction.approvalRequired || confirm ? (
        <div className="hub-interaction-actions">
          <Button
            variant="contained"
            disabled={disabled}
            onClick={() => {
              void reply(confirm ? { confirmed: true } : { decision: 'accept' })
            }}
          >
            {confirm ? '确认' : '批准'}
          </Button>
          <Button
            variant="outlined"
            disabled={disabled}
            onClick={() => {
              void reply(confirm ? { confirmed: false } : { decision: 'decline' })
            }}
          >
            {confirm ? '取消' : '拒绝'}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (questions) {
              void reply({
                answers: Object.fromEntries(
                  questions.map((question) => [
                    question.id,
                    { answers: [answers[question.id] || ''] },
                  ]),
                ),
              })
            } else if (interaction.method === 'a2a.message') {
              void reply({ text: value })
            } else if (interaction.method === 'extension_ui_request') {
              void reply({ value })
            } else {
              try {
                void reply(JSON.parse(value))
              } catch {
                setError('请输入有效的 JSON 对象。')
              }
            }
          }}
        >
          {questions ? (
            questions.map((question) => (
              <TextField
                key={question.id}
                required
                fullWidth
                size="small"
                label={question.question || question.header || question.id}
                value={answers[question.id] || ''}
                onChange={(event) =>
                  setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))
                }
              />
            ))
          ) : params.method === 'select' && params.options ? (
            <label>
              回复选项
              <select
                required
                aria-label="回复选项"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              >
                <option value="">请选择</option>
                {params.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          ) : (
            <TextField
              required
              fullWidth
              multiline
              size="small"
              label={
                interaction.method === 'extension_ui_request' ||
                interaction.method === 'a2a.message'
                  ? '回复内容'
                  : '回复 JSON'
              }
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          )}
          <Button type="submit" variant="contained" disabled={disabled}>
            发送回复
          </Button>
        </form>
      )}
    </Paper>
  )
}
