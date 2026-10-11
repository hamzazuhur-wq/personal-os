# Production Deployment — AI Backend Proxy

## Architecture

### Development
```
Browser → Vite dev server (port 5173)
         → proxies /api/ai/* → Backend proxy (port 3001)
         → Backend injects credentials → Provider API
```

### Production
```
Browser → Deployed backend server → Provider API
```

The browser **never** receives provider API keys.

---

## Environment Variables

### Required (at least one)

```bash
# OpenRouter (recommended for development)
OPENROUTER_API_KEY=sk-or-v1-...

# Or any other provider:
# OPENAI_API_KEY=sk-...
# GOOGLE_API_KEY=AIza...
# DEEPSEEK_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# XAI_API_KEY=xai-...
# MISTRAL_API_KEY=...
# GROQ_API_KEY=gsk_...
```

### Optional

```bash
# Custom base URLs (if not using provider defaults)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENAI_BASE_URL=https://api.openai.com/v1
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
XAI_BASE_URL=https://api.x.ai/v1
MISTRAL_BASE_URL=https://api.mistral.ai/v1
GROQ_BASE_URL=https://api.groq.com/openai/v1
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
CUSTOM_API_KEY=...
CUSTOM_BASE_URL=http://localhost:11434/v1

# Proxy server port (default: 3001)
PROXY_PORT=3001
```

---

## Deployment Options

### Option A: Node.js Server (Recommended)

Deploy `server/index.ts` alongside the static frontend.

1. Build frontend: `npm run build`
2. Serve `dist/` with any static server
3. Run proxy server on same host or separate host
4. Configure reverse proxy (nginx/Caddy) to route `/api/ai/*` to proxy server

**Docker example:**
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY server/ server/
COPY dist/ dist/
EXPOSE 3001
CMD ["node", "server/index.ts"]
```

### Option B: Serverless Function

Convert `server/index.ts` logic to a serverless function (Vercel, Netlify, Cloudflare Workers).

**Important:** Serverless functions must preserve streaming for SSE responses.

### Option C: Existing Backend

If you already have a backend (Express, Fastify, etc.), integrate the proxy logic from `server/index.ts`.

---

## Security Rules

1. **Never** log `api_key`, `Authorization` headers, or full request bodies containing credentials.
2. **Never** return `api_key` to the browser in any response.
3. **Never** put API keys in frontend code, URLs, or client-side diagnostics.
4. The `X-Provider-Connection` header is a **server-side reference only**. Do not expose connection IDs in ways that enable enumeration.
5. In production, replace the environment-variable credential registry with a proper secrets manager (Vault, AWS Secrets Manager, etc.).

---

## Frontend Configuration

### Endpoint Field

In production, set `AISettings.endpoint` to your deployed backend URL:

```
https://your-domain.com/api/ai
```

### Active Connection

The browser stores `active_connection_id` in IndexedDB. This ID is sent as the `X-Provider-Connection` header. The backend uses it to look up credentials.

**Do not store raw API keys in IndexedDB for production use.** The current local-first architecture stores credentials client-side for development convenience. For production, migrate credentials to server-side storage.

---

## Multi-Provider Support

The backend proxy supports all built-in provider types:

- OpenRouter
- OpenAI
- Google AI Studio
- DeepSeek
- Anthropic
- xAI
- Mistral
- Groq
- Ollama
- Custom OpenAI-compatible

Add a provider by:
1. Setting the corresponding environment variable (e.g., `OPENAI_API_KEY`)
2. Creating a connection in AI Settings with matching `provider_type`
3. The proxy automatically routes to the correct endpoint

---

## Streaming

The proxy preserves SSE streaming for providers that support it (`supportsStreaming: true` in capabilities). Non-streaming responses are buffered and returned as JSON.

---

## Error Normalization

The proxy returns normalized errors:

| HTTP Status | Error Code | Meaning |
|-------------|------------|---------|
| 400 | `invalid_request` | Missing connection ID or malformed request |
| 404 | `provider_unavailable` | Connection ID not configured |
| 502 | `provider_unavailable` | Provider endpoint unreachable |
| 503 | `proxy_error` | Proxy internal error |

Provider-specific errors (401, 429, etc.) are passed through with secrets stripped.

---

## Testing

1. Start proxy: `npm run proxy`
2. Start frontend: `npm run dev`
3. Open AI Settings → Add Provider → enter credentials
4. Test Connection → should succeed via proxy
5. Send AI prompt → should succeed via proxy

Verify with browser dev tools:
- Request URL should be `/api/ai/chat/completions`
- Response should come from backend, not directly from provider
- No `Authorization` header visible in browser (it's added server-side)
