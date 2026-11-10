import type { Agent } from '../types'

export const demoMode = import.meta.env.VITE_REIN_MODE === 'demo'
export type HubRun = {
  id: string
  attemptId: string
  sessionId: string
  agentId: string
  state: string
  cancelRequested: boolean
}
export type HubEvent = {
  attempt: { runId: string; attemptId: string }
  sequence: string
  state?: { state: string }
  text?: { itemId: string; text: string; complete: boolean; reasoning: boolean }
  tool?: {
    callId: string
    name: string
    inputJson: string
    outputJson: string
    complete: boolean
    isError: boolean
  }
  interaction?: {
    interactionId: string
    approvalRequired: boolean
    method: string
    parametersJson: string
  }
  error?: { code: string; message: string }
  result?: { state: string; executionStopped: boolean }
}
export type RunRecord = {
  version: string
  run: HubRun
  prompt: string
  created_at: string
  command_acks?: { commandId: string; state: string; errorCode: string }[]
}
export type RunUpdate = RunRecord & { events: HubEvent[] }
export type HistoryPage = {
  runs: RunUpdate[]
  sessions: { id: string; prompt: string }[]
  session_id: string
  next_cursor: string
  stream_cursor: string
}
export type HubAgent = Agent & {
  disabled: boolean
  hubManaged: true
  backend: 'native' | 'a2a'
  runtimeId: string
  daemonId: string
  capabilities: string[]
}
type AgentInfo = {
  agent: { id: string; name: string; disabled?: boolean }
  runtime: {
    id: string
    daemonId: string
    provider: string
    backend: string
    capabilities: string[]
  }
  online: boolean
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const timeout = AbortSignal.timeout(15000)
  const response = await fetch(path, {
    ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  const body = await response
    .json()
    .catch(() => ({ error: 'Hub 返回了无效响应，请确认代理地址。' }))
  if (!response.ok)
    throw Object.assign(new Error(body.error || `Hub 请求失败 (${response.status})`), {
      status: response.status,
    })
  return body as T
}
export const hubService = {
  async agents(): Promise<HubAgent[]> {
    const response = await request<{ agents: AgentInfo[] }>('/api/agents')
    return response.agents.map(({ agent, runtime, online }) => ({
      id: agent.id,
      name: agent.name,
      disabled: !!agent.disabled,
      role: runtime.backend === 'BACKEND_KIND_A2A' ? 'A2A' : '原生',
      color: '#0866ff',
      online,
      cli: runtime.provider,
      provider: runtime.provider === 'pi' ? 'pi' : runtime.provider === 'codex' ? 'codex' : 'a2a',
      hubManaged: true,
      backend: runtime.backend === 'BACKEND_KIND_A2A' ? 'a2a' : 'native',
      runtimeId: runtime.id,
      daemonId: runtime.daemonId,
      capabilities: runtime.capabilities || [],
    }))
  },
  history(agentId: string, session: string, before: string, signal: AbortSignal) {
    const query = new URLSearchParams({ limit: '20', session_id: session })
    if (before) query.set('before', before)
    return request<HistoryPage>(`/api/agents/${encodeURIComponent(agentId)}/history?${query}`, {
      signal,
    })
  },
  stream(agentId: string, cursor: string) {
    return new EventSource(
      `/api/agents/${encodeURIComponent(agentId)}/events?cursor=${encodeURIComponent(cursor)}`,
    )
  },
  create(agentId: string, sessionId: string, prompt: string, requestId: string) {
    return request<{ run: HubRun }>('/api/runs', {
      method: 'POST',
      body: JSON.stringify({
        request_id: requestId,
        agent_id: agentId,
        session_id: sessionId,
        prompt,
      }),
    })
  },
  async cancel(run: HubRun, commandId: string) {
    const send = (current: HubRun) =>
      request(`/api/runs/${encodeURIComponent(current.id)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ command_id: commandId, attempt_id: current.attemptId }),
      })
    try {
      return await send(run)
    } catch (failure) {
      // 排队任务可能刚被领取；仅在尚未绑定 attempt 时刷新一次，保留 fencing。
      if (
        !run.attemptId &&
        failure instanceof Error &&
        'status' in failure &&
        failure.status === 409
      ) {
        const { run: current } = await request<{ run: HubRun }>(
          `/api/runs/${encodeURIComponent(run.id)}`,
        )
        if (terminalRun(current)) return
        return send(current)
      }
      throw failure
    }
  },
  reply(run: HubRun, interactionId: string, response: unknown, commandId: string) {
    return request(`/api/runs/${encodeURIComponent(run.id)}/reply`, {
      method: 'POST',
      body: JSON.stringify({
        command_id: commandId,
        attempt_id: run.attemptId,
        interaction_id: interactionId,
        response,
      }),
    })
  },
}
export function decodeJson<T = Record<string, unknown>>(value: string): T {
  if (!value) return {} as T
  return JSON.parse(
    new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0))),
  ) as T
}
export const terminalRun = (run: HubRun) =>
  ['RUN_STATE_COMPLETED', 'RUN_STATE_FAILED', 'RUN_STATE_CANCELLED'].includes(run.state)
export const runStateLabel: Record<string, string> = {
  RUN_STATE_QUEUED: '排队中',
  RUN_STATE_DISPATCHED: '准备执行',
  RUN_STATE_RUNNING: '执行中',
  RUN_STATE_WAITING_INPUT: '等待回复',
  RUN_STATE_WAITING_APPROVAL: '等待审批',
  RUN_STATE_COMPLETED: '已完成',
  RUN_STATE_FAILED: '执行失败',
  RUN_STATE_CANCELLED: '已取消',
}
