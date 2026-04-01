// ═══════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════
let currentIdea = '';
let conversationHistory = [];
let isStreaming = false;

// Color palette for role buttons and messages
const ROLE_COLORS = [
  '#00b894', '#0984e3', '#e17055', '#fdcb6e', '#6c5ce7',
  '#00cec9', '#e84393', '#55efc4', '#fab1a0', '#74b9ff',
  '#ff7675', '#a29bfe', '#fd79a8', '#ffeaa7', '#81ecec'
];

// ═══════════════════════════════════════════════════════════════════
// Default Roles
// ═══════════════════════════════════════════════════════════════════
const DEFAULT_ROLES = [
  {
    id: 'product',
    name: '产品经理',
    emoji: '🎯',
    color: '#fdcb6e',
    systemPrompt: `你是一位产品经理，参与一场关于项目 idea 的头脑风暴。

你的风格：
- 聚焦"做什么"和"优先级"——哪些功能是 P0 必须有的，哪些可以后面迭代
- 如果前面有人提了技术方案，你要从产品角度回应：这个方案对用户体验有什么影响？有没有更简单的替代？
- 如果前面有人提了难点，你要想：能不能通过缩小范围或换个产品策略绕过去？

说话简洁，像在白板前讨论，不要写报告。每次发言控制在150字以内。回应前面的观点时直接引用，不要重复别人说过的。`,
    provider: '', baseUrl: '', apiKey: '', model: ''
  },
  {
    id: 'techscout',
    name: '技术探路者',
    emoji: '🛠️',
    color: '#0984e3',
    systemPrompt: `你是一位全栈工程师，参与一场关于项目 idea 的头脑风暴。

你的风格：
- 聚焦"怎么做"和"能做到什么程度"——给出具体的技术路线，说清楚哪些容易实现、哪些是难点
- 如果前面有人提了需求或优先级，你要回应：这个用什么技术栈可以快速搞定？有什么坑？
- 如果有人质疑了你的方案，认真考虑他的观点，要么给出更好的方案，要么解释为什么原方案更合理
- 敢于说"这个短期做不到，但可以先这样妥协"

说话简洁，像在白板前讨论，不要写报告。每次发言控制在150字以内。回应前面的观点时直接引用。`,
    provider: '', baseUrl: '', apiKey: '', model: ''
  },
  {
    id: 'challenger',
    name: '挑战者',
    emoji: '🔍',
    color: '#e17055',
    systemPrompt: `你是一位经验丰富的创业顾问，参与一场关于项目 idea 的头脑风暴。

你的风格：
- 你不是来否定的，而是来追问"有没有想过这个情况"——帮大家发现盲区
- 如果前面有人提了方案，你要追问：最大的风险是什么？如果用户不买账怎么办？有没有更轻量的验证方式？
- 如果你提出质疑后别人给了回应，你要诚实地说"这个说服我了"或者"我还是觉得有问题，因为……"
- 偶尔也要肯定好的想法，不要只挑刺

说话简洁，像在白板前讨论，不要写报告。每次发言控制在150字以内。`,
    provider: '', baseUrl: '', apiKey: '', model: ''
  }
];

const SUMMARY_ROLE = {
  id: 'summary',
  name: '总结生成器',
  emoji: '📄',
  color: '#a29bfe',
  systemPrompt: `你是一位专业的项目文档撰写者。根据讨论内容，生成一份完整、结构化的项目 Prompt 文档。

文档应包含：
1. **项目概述** - 一句话描述 + 项目背景
2. **核心目标** - 要解决的问题和预期成果
3. **目标用户** - 用户画像和使用场景
4. **功能需求** - 分优先级的功能列表
5. **技术方案** - 推荐技术栈和架构设计
6. **数据模型** - 核心数据结构
7. **里程碑计划** - 阶段划分和关键节点
8. **风险评估** - 已识别的风险和应对策略
9. **开放问题** - 待进一步讨论的事项

请用中文撰写，使用 markdown 格式。每个章节精炼到核心要点，避免冗余展开，总量控制在800字以内。`
};

// ═══════════════════════════════════════════════════════════════════
// Storage helpers
// ═══════════════════════════════════════════════════════════════════
function loadGlobalSettings() {
  const raw = localStorage.getItem('ideaforge_global');
  return raw ? JSON.parse(raw) : { provider: 'openai', baseUrl: '', apiKey: '', model: '' };
}

function saveGlobalSettingsToStorage(settings) {
  localStorage.setItem('ideaforge_global', JSON.stringify(settings));
}

function loadRoles() {
  const raw = localStorage.getItem('ideaforge_roles');
  if (raw) return JSON.parse(raw);
  // First time: use defaults
  saveRolesToStorage(DEFAULT_ROLES);
  return DEFAULT_ROLES;
}

function saveRolesToStorage(roles) {
  localStorage.setItem('ideaforge_roles', JSON.stringify(roles));
}

function getRoles() {
  return loadRoles();
}

// Get effective config for a role (role override > global)
function getEffectiveConfig(role) {
  const g = loadGlobalSettings();
  return {
    provider: role.provider || g.provider || 'openai',
    baseUrl:  role.baseUrl  || g.baseUrl  || '',
    apiKey:   role.apiKey   || g.apiKey   || '',
    model:    role.model    || g.model    || ''
  };
}

// ═══════════════════════════════════════════════════════════════════
// DOM refs
// ═══════════════════════════════════════════════════════════════════
const ideaSection = document.getElementById('ideaSection');
const workspace   = document.getElementById('workspace');
const ideaDisplay = document.getElementById('ideaDisplay');
const discussion  = document.getElementById('discussion');
const roleButtons = document.getElementById('roleButtons');
const ideaInput   = document.getElementById('ideaInput');
const userInput   = document.getElementById('userInput');

// ═══════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderRoleButtons();
});

// ═══════════════════════════════════════════════════════════════════
// Role buttons rendering
// ═══════════════════════════════════════════════════════════════════
function renderRoleButtons() {
  const roles = getRoles();
  roleButtons.innerHTML = roles.map(r => {
    const c = r.color || ROLE_COLORS[0];
    return `<button class="role-btn" data-role="${r.id}"
              style="border-color:${c}"
              onmouseenter="this.style.background='${c}'"
              onmouseleave="this.style.background='transparent'"
              onclick="triggerRole('${r.id}')">
      ${r.emoji} ${r.name}
    </button>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// Session management
// ═══════════════════════════════════════════════════════════════════
function startSession() {
  const idea = ideaInput.value.trim();
  if (!idea) { ideaInput.focus(); return; }

  currentIdea = idea;
  conversationHistory = [];
  discussion.innerHTML = '';
  ideaDisplay.textContent = idea;
  ideaSection.style.display = 'none';
  workspace.style.display = 'block';
}

function resetSession() {
  currentIdea = '';
  conversationHistory = [];
  discussion.innerHTML = '';
  workspace.style.display = 'none';
  ideaSection.style.display = 'block';
  ideaInput.value = '';
  ideaInput.focus();
}

// ═══════════════════════════════════════════════════════════════════
// Trigger role analysis
// ═══════════════════════════════════════════════════════════════════
async function triggerRole(roleId) {
  if (isStreaming) return;

  // Find role config
  let role;
  if (roleId === 'summary') {
    role = SUMMARY_ROLE;
  } else {
    role = getRoles().find(r => r.id === roleId);
  }
  if (!role) return;

  const config = getEffectiveConfig(role);

  if (!config.apiKey) {
    alert('请先在设置中配置 API Key（点右上角齿轮图标）');
    return;
  }

  // Build messages for API
  const messages = [{ role: 'user', content: `项目 Idea：${currentIdea}` }];

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else {
      messages.push({ role: 'assistant', content: `[${msg.name}]：${msg.content}` });
    }
  }

  // If last message is assistant, add a trigger prompt
  if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
    messages.push({
      role: 'user',
      content: `请以${role.name}的角色，基于以上讨论内容，给出你的分析和建议。`
    });
  }

  // Create message element
  const msgEl = addMessage(roleId, role.emoji, role.name, role.color);
  const bodyEl = msgEl.querySelector('.message-body');

  setStreaming(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: config.provider,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        systemPrompt: role.systemPrompt,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json();
      bodyEl.innerHTML = `<span style="color:var(--danger)">错误：${err.error}</span>`;
      setStreaming(false);
      return;
    }

    let fullText = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            bodyEl.innerHTML = `<span style="color:var(--danger)">错误：${parsed.error}</span>`;
            setStreaming(false);
            return;
          }
          if (parsed.text) {
            fullText += parsed.text;
            bodyEl.innerHTML = marked.parse(fullText);
            scrollToBottom();
          }
        } catch {}
      }
    }

    conversationHistory.push({
      role: 'assistant',
      name: role.name,
      roleId,
      content: fullText
    });
  } catch (err) {
    bodyEl.innerHTML = `<span style="color:var(--danger)">连接错误：${err.message}</span>`;
  }

  setStreaming(false);
}

// ═══════════════════════════════════════════════════════════════════
// User message
// ═══════════════════════════════════════════════════════════════════
function sendUserMessage() {
  const text = userInput.value.trim();
  if (!text || isStreaming) return;

  const msgEl = addMessage('user', '💬', '你', null);
  msgEl.querySelector('.message-body').textContent = text;

  conversationHistory.push({ role: 'user', name: '用户', roleId: 'user', content: text });

  userInput.value = '';
  userInput.style.height = 'auto';
  scrollToBottom();
}

function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
  setTimeout(() => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, 0);
}

function generateSummary() {
  if (isStreaming) return;
  if (conversationHistory.length === 0) {
    alert('还没有讨论内容，请先点击角色按钮开始分析');
    return;
  }
  triggerRole('summary');
}

// ═══════════════════════════════════════════════════════════════════
// UI helpers
// ═══════════════════════════════════════════════════════════════════
function addMessage(roleId, emoji, name, color) {
  const div = document.createElement('div');
  div.className = 'message';
  div.dataset.role = roleId;
  const nameColor = color || (roleId === 'user' ? 'var(--user-color)' : 'var(--summary)');
  const borderColor = color ? `${color}30` : 'var(--border)';
  div.innerHTML = `
    <div class="message-header">
      <span class="message-avatar">${emoji}</span>
      <span class="message-name" style="color:${nameColor}">${name}</span>
    </div>
    <div class="message-body" style="border-color:${borderColor}">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  discussion.appendChild(div);
  scrollToBottom();
  return div;
}

function setStreaming(streaming) {
  isStreaming = streaming;
  document.querySelectorAll('.role-btn').forEach(btn => btn.disabled = streaming);
  const exportBtn = document.querySelector('.btn-export');
  if (exportBtn) exportBtn.disabled = streaming;
}

function scrollToBottom() {
  discussion.scrollTop = discussion.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════
// Settings Modal
// ═══════════════════════════════════════════════════════════════════
function openSettings() {
  const g = loadGlobalSettings();
  document.getElementById('globalProvider').value = g.provider || 'openai';
  document.getElementById('globalBaseUrl').value = g.baseUrl || '';
  document.getElementById('globalApiKey').value = g.apiKey || '';
  document.getElementById('globalModel').value = g.model || '';
  renderRoleList();
  document.getElementById('settingsModal').classList.add('show');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('show');
  renderRoleButtons(); // refresh buttons in case roles changed
}

function switchTab(btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(btn.dataset.tab).classList.add('active');
}

function saveGlobalSettings() {
  const settings = {
    provider: document.getElementById('globalProvider').value,
    baseUrl:  document.getElementById('globalBaseUrl').value.trim(),
    apiKey:   document.getElementById('globalApiKey').value.trim(),
    model:    document.getElementById('globalModel').value.trim()
  };
  saveGlobalSettingsToStorage(settings);
  closeSettings();
}

// ═══════════════════════════════════════════════════════════════════
// Role List (in settings)
// ═══════════════════════════════════════════════════════════════════
function renderRoleList() {
  const roles = getRoles();
  const list = document.getElementById('roleList');
  list.innerHTML = roles.map(r => {
    const cfg = getEffectiveConfig(r);
    const meta = `${cfg.provider === 'anthropic' ? 'Anthropic' : 'OpenAI兼容'} · ${cfg.model || '默认模型'}`;
    const hasOverride = r.provider || r.baseUrl || r.apiKey || r.model;
    return `<div class="role-list-item">
      <span class="role-list-emoji">${r.emoji}</span>
      <div class="role-list-info">
        <div class="role-list-name">${r.name}${hasOverride ? ' <span style="color:var(--accent);font-size:0.75em">独立配置</span>' : ''}</div>
        <div class="role-list-meta">${meta}</div>
      </div>
      <div class="role-list-actions">
        <button onclick="openRoleEditor('${r.id}')">编辑</button>
        <button class="btn-delete" onclick="deleteRole('${r.id}')">删除</button>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// Role Editor
// ═══════════════════════════════════════════════════════════════════
function openRoleEditor(roleId) {
  const isEdit = !!roleId;
  document.getElementById('roleEditorTitle').textContent = isEdit ? '编辑角色' : '添加角色';

  if (isEdit) {
    const role = getRoles().find(r => r.id === roleId);
    if (!role) return;
    document.getElementById('roleEditId').value = role.id;
    document.getElementById('roleEditName').value = role.name;
    document.getElementById('roleEditEmoji').value = role.emoji;
    document.getElementById('roleEditPrompt').value = role.systemPrompt;
    document.getElementById('roleEditProvider').value = role.provider || '';
    document.getElementById('roleEditBaseUrl').value = role.baseUrl || '';
    document.getElementById('roleEditApiKey').value = role.apiKey || '';
    document.getElementById('roleEditModel').value = role.model || '';
  } else {
    document.getElementById('roleEditId').value = '';
    document.getElementById('roleEditName').value = '';
    document.getElementById('roleEditEmoji').value = '';
    document.getElementById('roleEditPrompt').value = '';
    document.getElementById('roleEditProvider').value = '';
    document.getElementById('roleEditBaseUrl').value = '';
    document.getElementById('roleEditApiKey').value = '';
    document.getElementById('roleEditModel').value = '';
  }

  document.getElementById('roleEditorModal').classList.add('show');
}

function closeRoleEditor() {
  document.getElementById('roleEditorModal').classList.remove('show');
}

function saveRole() {
  const name = document.getElementById('roleEditName').value.trim();
  const emoji = document.getElementById('roleEditEmoji').value.trim() || '🤖';
  const systemPrompt = document.getElementById('roleEditPrompt').value.trim();

  if (!name) { alert('请输入角色名称'); return; }
  if (!systemPrompt) { alert('请输入 System Prompt'); return; }

  const editId = document.getElementById('roleEditId').value;
  const roles = getRoles();

  const roleData = {
    id: editId || 'custom_' + Date.now(),
    name,
    emoji,
    color: null, // will be assigned
    systemPrompt,
    provider: document.getElementById('roleEditProvider').value,
    baseUrl:  document.getElementById('roleEditBaseUrl').value.trim(),
    apiKey:   document.getElementById('roleEditApiKey').value.trim(),
    model:    document.getElementById('roleEditModel').value.trim()
  };

  if (editId) {
    // Update existing
    const idx = roles.findIndex(r => r.id === editId);
    if (idx !== -1) {
      roleData.color = roles[idx].color; // keep color
      roles[idx] = roleData;
    }
  } else {
    // Assign a color
    roleData.color = ROLE_COLORS[roles.length % ROLE_COLORS.length];
    roles.push(roleData);
  }

  saveRolesToStorage(roles);
  renderRoleList();
  closeRoleEditor();
}

function deleteRole(roleId) {
  if (!confirm('确定删除这个角色？')) return;
  const roles = getRoles().filter(r => r.id !== roleId);
  saveRolesToStorage(roles);
  renderRoleList();
}
