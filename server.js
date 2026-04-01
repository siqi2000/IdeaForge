const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Anthropic native streaming ──────────────────────────────────────
async function streamAnthropic(config, res) {
  const client = new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {})
  });

  const stream = await client.messages.stream({
    model: config.model || 'claude-sonnet-4-20250514',
    max_tokens: config.maxTokens || 4096,
    system: config.systemPrompt,
    messages: config.messages
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }
}

// ── OpenAI-compatible streaming (works with most relays) ────────────
async function streamOpenAI(config, res) {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  // Build messages in OpenAI format (system as first message)
  const messages = [];
  if (config.systemPrompt) {
    messages.push({ role: 'system', content: config.systemPrompt });
  }
  for (const msg of config.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      messages,
      max_tokens: config.maxTokens || 4096,
      stream: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText}`);
  }

  // Parse SSE stream
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
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      } catch {}
    }
  }
}

// ── Chat endpoint ───────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { provider, baseUrl, apiKey, model, systemPrompt, messages, maxTokens } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: '请先在设置中配置 API Key' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const config = { baseUrl, apiKey, model, systemPrompt, messages, maxTokens };

  try {
    if (provider === 'anthropic') {
      await streamAnthropic(config, res);
    } else {
      await streamOpenAI(config, res);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('API Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IdeaForge 运行在 http://localhost:${PORT}`);
});
