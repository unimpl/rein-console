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
- 可隐藏和恢复的侧栏、default 工作空间、项目和需求树、Agent 名册；设置仅通过头像菜单进入。
- 工作空间、项目、需求和状态分组各自的聊天上下文；消息左右对齐、发送、换行、滚动、提及成员及本地附件名称演示。
- 待开始、进行中、已完成任务分组；执行动画、等待回复提示、任务筛选、新建和状态切换。
- 拖动分隔线调整聊天/任务宽度，左右方向键也可调整；分栏比例与侧栏偏好保存至 localStorage。
- 等高、右侧贴边的覆盖式 Drawer，未调整前左边界对齐 Todo 标题文字的右边缘；拖动或用方向键调整后，将占窗口宽度的比例保存在 localStorage，切换任务、重新打开和刷新均沿用，窗口缩放时按比例适配（受最小宽度和可用空间限制）；可展开至最大可用宽度并恢复原比例，不改变底层分栏。
- 活动、CLI、结果页签；切换 Agent 会话、模拟接管输入、停止/开始/完成任务、查看会话记录。
- 通用、模型与连接、执行环境、通知、数据与隐私五类配置；编辑后自动保存并反馈，支持模拟连接管理、模拟数据 JSON 导出和重置。
- 小屏使用导航抽屉和群聊/任务切换，任务分组纵向排列，保持输入与操作可用。

## 数据与安全边界

- `src/types.ts` 定义 Workspace、Project、Requirement、Task、Agent、Message、Session 等类型。
- `src/services/seed.ts` 集中定义演示项目、任务、消息、终端输出和会话。
- `src/services/reinService.ts` 是异步数据适配层，提供读取、订阅、发送、任务更新、模拟命令、导出等接口，后续可替换成 HTTP/WebSocket。
- `src/services/preferences.ts` 仅保存普通界面与配置偏好，不保存密码、API 密钥或真实凭据。
- 登录、Agent 回复、CLI、连接状态、执行环境、后台运行、桌面通知均为模拟；不会启动 CLI、执行输入的命令或连接模型/执行服务。
- 消息、任务、会话与新增模拟连接仅保留在当前页面内存，刷新恢复演示数据。本地附件只显示名称，不读取或上传内容。
- Agent 管理完整页面和任务流画布在草稿中未提供设计，当前为明确的待实现入口。
- 首阶段仅提供浅色主题、简体中文及 default 工作空间。

## 视觉实现

视觉来源为 Figma `pzrgKXgJAyugcvBNC16Ick` 的 2:34、2:35、12:1111–12:1116、24:3887、24:4369。按 1600×900 的逻辑尺寸实现 Flex/Grid 布局，不对整页缩放。字体在依赖中本地托管，图标从 Figma 下载至 `public/icons`；未将整张设计截图用作页面。

统一 MUI theme 位于 `src/theme.ts`；正文 13px、标签 12px、辅助信息 11px、标题 15px，CLI 使用 JetBrains Mono。组件位于 `src/components`。

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
