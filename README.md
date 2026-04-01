# IdeaForge

多角色 AI 协作工具，帮你用头脑风暴的方式打磨项目 Idea。

## 功能

- **多角色讨论**：产品经理、技术探路者、挑战者，各自从不同视角分析你的想法
- **自定义角色**：可以自由添加/编辑/删除角色，自定义 System Prompt
- **灵活 API 配置**：支持 OpenAI 兼容格式（大多数中转站）和 Anthropic 原生，每个角色可独立配置不同的 API 和模型
- **实时流式输出**：SSE 流式响应，打字机效果
- **用户随时插话**：你也是讨论的一员，随时参与引导方向
- **一键生成文档**：将讨论成果汇总为结构化的项目 Prompt 文档

## 快速开始

```bash
# 安装依赖
npm install

# 启动
npm start
```

打开 `http://localhost:3000`，点右上角齿轮设置 API Key 即可使用。

## 配置说明

在页面右上角齿轮图标中设置：

| 配置项 | 说明 |
|--------|------|
| API 协议 | OpenAI 兼容（适用大多数中转站）或 Anthropic 原生 |
| Base URL | API 地址，如 `https://your-relay.com/v1` |
| API Key | 你的密钥 |
| 默认模型 | 如 `gpt-4o`、`claude-sonnet-4-20250514` 等 |

每个角色可以在编辑时展开"独立 API 配置"来覆盖全局设置。

## 技术栈

- 前端：原生 HTML/CSS/JS + Marked.js（Markdown 渲染）
- 后端：Node.js + Express
- AI：Anthropic SDK + OpenAI 兼容 API
