# Rein Console

基于 Figma 草稿实现的 Rein Web 前端，使用 React、TypeScript、Vite 和 `@mui/material`。所有运行数据均为模拟数据。

## 启动

需要 Node.js 20.19+ 或 22.12+。

```bash
cd /Users/xhb/github/rein-console
npm install
npm run dev -- --host 127.0.0.1
```

打开 http://127.0.0.1:5173。默认直接进入演示工作空间。通过左下角头像菜单退出后可查看登录页；使用任意虚构邮箱和至少 4 位演示密码即可登录，GitHub / 企业账号入口同样进入模拟登录流程。刷新页面会重新载入初始演示工作空间。

```bash
npm run typecheck
npm run lint
npm run build
npm run preview -- --host 127.0.0.1
```

## 已实现

- 与 Figma 共用状态的主界面、右侧覆盖抽屉、头像菜单、退出确认、登录及配置弹窗。
- 可收起为 56px 窄栏的侧栏；保留恢复、当前工作空间/项目/需求对话及底部头像。设置仅通过头像菜单进入。
- 项目树支持展开/收纳，项目对话为首个子项，需求没有子树；项目先显示 5 个，每次“展示更多”追加 3 个。项目列表有独立的最大高度和滚动区域，展开多棵树时不滚动整个侧栏。
- 项目标题旁可新建项目，悬停项目行可编辑名称和描述；需求分类标题旁可新建需求，悬停需求行可编辑，保存后更新导航和对应聊天。
- 工作空间、项目、需求、任务状态分组及 Agent 各自的聊天上下文；消息左右对齐、发送、换行、滚动、提及成员及本地附件名称演示。输入区不展示范围标签。
- 选择 Agent 对话时，右侧 Todo 切换为 Memory 知识图谱示意；Memory 内容与结构仍在规划。
- 待开始、进行中、已完成任务分组；执行动画、等待回复提示、任务筛选、新建和状态切换。
- 拖动分隔线调整聊天/任务宽度，左右方向键也可调整；分栏比例与侧栏偏好保存至 localStorage。收起或恢复侧栏保持聊天宽度，释放的空间全部分配给右侧任务/Memory（受最小宽度约束）。
- 等高、右侧贴边的覆盖式 Drawer，未调整前左边界对齐 Todo 标题文字的右边缘；拖动或用方向键调整后，将占窗口宽度的比例保存在 localStorage，切换任务、重新打开和刷新均沿用，窗口缩放时按比例适配（受最小宽度和可用空间限制）；可展开至最大可用宽度并恢复原比例，不改变底层分栏。
- 活动、CLI、结果页签；切换 Agent 会话、模拟接管输入、停止/开始/完成任务、查看会话记录。
- 通用、模型与连接、执行环境、通知、数据与隐私五类配置；编辑后自动保存并反馈，支持模拟连接管理、模拟数据 JSON 导出和重置。
- Alex / Sam / Robin 的头像分别使用 Claude / Codex / pi 标志，并在所有聊天、任务和详情中复用。Agent 行右侧齿轮打开独立配置：A2A、本地、SKILL、记忆存储；支持编辑、校验、自动保存和按 Agent 隔离。
- 聊天与 Todo 顶部齿轮为“设置功能待确定”占位，不触发创建任务或聊天范围说明。
- 小屏保留窄侧栏，可展开导航抽屉，并切换聊天与任务/Memory；任务分组纵向排列，保持输入与操作可用。

## 数据与安全边界

- `src/types.ts` 定义 Workspace、Project、Requirement、Task、Agent、Message、Session 等类型。
- `src/services/seed.ts` 集中定义演示项目、任务、消息、终端输出和会话。
- `src/services/reinService.ts` 是异步数据适配层，提供读取、订阅、发送、任务更新、模拟命令、导出等接口，后续可替换成 HTTP/WebSocket。
- `src/services/preferences.ts` 仅保存普通界面与配置偏好，不保存密码、API 密钥或真实凭据。
- 登录、Agent 回复、CLI、连接状态、执行环境、后台运行、桌面通知均为模拟；不会启动 CLI、执行输入的命令或连接模型/执行服务。
- 项目及需求的新建/编辑、Agent 配置、消息、任务、会话与新增模拟连接仅保留在当前页面内存，刷新恢复演示数据。本地附件只显示名称，不读取或上传内容。Agent 配置不读取 SKILL 文件、不创建记忆目录、不访问配置的地址、不执行 CLI。
- Agent 管理入口已按最新要求移除；任务流画布保留明确的待实现入口。Memory 图谱为静态占位，不执行记忆读写。
- 首阶段仅提供浅色主题、简体中文及 default 工作空间。

## 视觉实现

视觉来源为 Figma `pzrgKXgJAyugcvBNC16Ick` 的 2:34、2:35、12:1111–12:1116、24:3887、24:4369，以及本轮同步更新的窄栏、Memory、项目/需求表单与展开项目列表画板（35:6684、35:7371、36:7143、36:7677、36:8211、36:8745）。保留 Material UI 和原稿参考的 ChatGPT UI Kit 紧凑交互样式。按 1600×900 的逻辑尺寸实现 Flex/Grid 布局，不对整页缩放。字体在依赖中本地托管，图标从 Figma 下载至 `public/icons`，编辑图标使用同系列 Material SVG；未将整张设计截图用作页面。

统一 MUI theme 位于 `src/theme.ts`；正文 13px、标签 12px、辅助信息 11px、标题 15px，CLI 使用 JetBrains Mono。组件位于 `src/components`。

本轮反馈对应 Figma 主界面、窄栏和项目滚动画板，以及新增的需求编辑（42:9884）与四类 Agent 配置（42:10955、42:11680、42:12405、42:13120）。品牌标志来源记录在 `public/providers/README.md`。

Agent 配置项参考 [A2A Agent Card 与接口定义](https://a2a-protocol.org/latest/specification/)、[AutoGen 本地执行参数](https://microsoft.github.io/autogen/stable/reference/python/autogen_ext.code_executors.local.html)、[pi SKILL 配置](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md) 和 [AutoGen 持久化记忆](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/memory.html)。这里是 Rein 的模拟配置表单，不宣称与这些工具的原生配置格式兼容。

## 浏览器验收

```bash
npx playwright install chromium
npm run test:e2e
```

也可以使用已有 Chrome（macOS 示例）：

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e
```

测试覆盖上下文隔离、消息发送、任务状态、Drawer 覆盖/展开、模拟终端、会话记录、分栏持久化、侧栏、配置编辑、退出确认、登录及窄屏交互。截图证据保存在本机 `.impeccable/review/`（不纳入 Git）。
