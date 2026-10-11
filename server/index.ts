import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import {
  getConnection,
  listConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  generateId,
  reloadConnections,
  type ProviderConnection,
  type ProviderCapabilities,
} from './connections.ts';

// ============================================================
// AI BACKEND PROXY — Node.js HTTP Server
// ============================================================
// Handles:
//   - Provider connection CRUD (metadata only, credentials server-side)
//   - Health checks
//   - Request forwarding with credential injection
//
// Development: Browser → Vite dev server → This proxy → Provider
// Production:   Browser → This server (deployed) → Provider
// ============================================================

// ============================================================
// HELPERS
// ============================================================

function writeJsonResponse(res: http.ServerResponse, body: any, statusCode: number): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function scrubSecret(value: string): string {
  if (!value) return '';
  return value.slice(-4);
}

function connectionToPublic(conn: ProviderConnection) {
  return {
    id: conn.id,
    name: conn.name,
    provider_type: conn.provider_type,
    base_url: conn.base_url,
    api_key_last_four: scrubSecret(conn.api_key_last_four || conn.api_key),
    enabled: conn.enabled,
    connection_status: conn.connection_status,
    capabilities: conn.capabilities,
    last_tested_at: conn.last_tested_at,
    last_tested_error: conn.last_tested_error,
    created_at: conn.created_at,
    updated_at: conn.updated_at,
  };
}

// ============================================================
// REQUEST FORWARDING
// ============================================================

async function forwardRequest(req: http.IncomingMessage, res: http.ServerResponse, connectionId: string, path: string): Promise<void> {
  const connection = getConnection(connectionId);

  if (!connection) {
    writeJsonResponse(res, {
      error: 'provider_unavailable',
      message: `Provider connection '${connectionId}' not configured on server.`,
    }, 404);
    return;
  }

  let targetUrl: string;
  try {
    const base = connection.base_url.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    targetUrl = `${base}/${cleanPath}`;
  } catch {
    writeJsonResponse(res, {
      error: 'invalid_request',
      message: 'Invalid request URL.',
    }, 400);
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Copy safe headers from incoming request
  const safeHeaders = ['accept', 'accept-encoding', 'x-request-id', 'x-custom-header'];
  for (const h of safeHeaders) {
    const val = req.headers[h];
    if (val) headers[h] = typeof val === 'string' ? val : val[0];
  }

  // Inject authentication
  if (connection.capabilities.authMethod === 'bearer' && connection.api_key) {
    headers['Authorization'] = `Bearer ${connection.api_key}`;
  }

  // Provider-specific headers
  if (connection.provider_type === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:5173';
    headers['X-Title'] = 'Aura Leveling';
  }

  const body = await readRequestBody(req);

  const options: http.RequestOptions = {
    hostname: new URL(targetUrl).hostname,
    port: new URL(targetUrl).port || (new URL(targetUrl).protocol === 'https:' ? 443 : 80),
    path: new URL(targetUrl).pathname + (new URL(targetUrl).search || ''),
    method: req.method || 'GET',
    headers,
  };

  const targetUrlStr = targetUrl;
  const parsedTarget = new URL(targetUrlStr);
  const isHttps = parsedTarget.protocol === 'https:';

  const requestFn = isHttps ? https.request : http.request;

  const proxyReq = requestFn(options, (proxyRes) => {
    if (connection.capabilities.supportsStreaming && path.includes('chat/completions')) {
      res.writeHead(proxyRes.statusCode || 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      proxyRes.on('data', (chunk: Buffer) => {
        res.write(chunk);
      });

      proxyRes.on('end', () => {
        res.end();
      });

      proxyRes.on('error', (err) => {
        console.error('Proxy stream error:', err.message);
        res.end();
      });
    } else {
      let data = '';
      proxyRes.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      proxyRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          res.writeHead(proxyRes.statusCode || 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(json));
        } catch {
          res.writeHead(proxyRes.statusCode || 200, { 'Content-Type': 'text/plain' });
          res.end(data);
        }
      });
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy request error:', err.message);
    writeJsonResponse(res, {
      error: 'provider_unavailable',
      message: `Failed to reach provider: ${err.message}`,
    }, 502);
  });

  if (body) {
    proxyReq.write(body);
  }
  proxyReq.end();
}

async function readRequestBody(req: http.IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  return new Promise((resolve) => {
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length > 0) {
        resolve(Buffer.concat(chunks).toString());
      } else {
        resolve(undefined);
      }
    });
  });
}

// ============================================================
// PROVIDER CONNECTION ROUTES
// ============================================================

async function handleHealth(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  writeJsonResponse(res, { status: 'ok', timestamp: new Date().toISOString() }, 200);
}

async function handleListProviders(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const connections = listConnections().map(connectionToPublic);
  writeJsonResponse(res, { providers: connections }, 200);
}

async function handleCreateProvider(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await readRequestBody(req);
    if (!body) {
      writeJsonResponse(res, { error: 'invalid_request', message: 'Missing request body.' }, 400);
      return;
    }

    const data = JSON.parse(body);
    const required = ['name', 'provider_type', 'base_url'];
    for (const field of required) {
      if (!data[field]) {
        writeJsonResponse(res, { error: 'validation_error', message: `Missing required field: ${field}` }, 400);
        return;
      }
    }

    const capabilities: ProviderCapabilities = data.capabilities || {
      authMethod: data.api_key ? 'bearer' : 'none',
      chatEndpoint: '/chat/completions',
      discoveryEndpoint: '/models',
      supportsStreaming: true,
    };

    const now = new Date().toISOString();
    const connection: ProviderConnection = {
      id: generateId(),
      provider_type: data.provider_type,
      base_url: data.base_url.replace(/\/+$/, ''),
      api_key: data.api_key || '',
      capabilities,
      name: data.name,
      enabled: data.enabled ?? true,
      connection_status: 'not_tested',
      api_key_last_four: data.api_key ? data.api_key.slice(-4) : undefined,
      created_at: now,
      updated_at: now,
    };

    createConnection(connection);
    writeJsonResponse(res, { provider: connectionToPublic(connection) }, 201);
  } catch {
    writeJsonResponse(res, { error: 'invalid_request', message: 'Invalid JSON body.' }, 400);
  }
}

async function handleUpdateProvider(req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
  try {
    const body = await readRequestBody(req);
    if (!body) {
      writeJsonResponse(res, { error: 'invalid_request', message: 'Missing request body.' }, 400);
      return;
    }

    const data = JSON.parse(body);
    const patch: Partial<ProviderConnection> = {};

    if (data.name !== undefined) patch.name = data.name;
    if (data.base_url !== undefined) patch.base_url = data.base_url.replace(/\/+$/, '');
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.capabilities !== undefined) patch.capabilities = data.capabilities;

    if (data.api_key !== undefined && data.api_key !== '') {
      patch.api_key = data.api_key;
      patch.api_key_last_four = data.api_key.slice(-4);
    }

    const updated = updateConnection(id, patch);
    if (!updated) {
      writeJsonResponse(res, { error: 'not_found', message: `Provider connection '${id}' not found.` }, 404);
      return;
    }

    writeJsonResponse(res, { provider: connectionToPublic(updated) }, 200);
  } catch {
    writeJsonResponse(res, { error: 'invalid_request', message: 'Invalid JSON body.' }, 400);
  }
}

async function handleDeleteProvider(_req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
  const deleted = deleteConnection(id);
  if (!deleted) {
    writeJsonResponse(res, { error: 'not_found', message: `Provider connection '${id}' not found.` }, 404);
    return;
  }
  writeJsonResponse(res, { deleted: true }, 200);
}

async function handleTestProvider(req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
  const connection = getConnection(id);
  if (!connection) {
    writeJsonResponse(res, { error: 'not_found', message: `Provider connection '${id}' not found.` }, 404);
    return;
  }

  const start = Date.now();
  try {
    const baseUrl = connection.base_url.replace(/\/$/, '');
    const chatPath = connection.capabilities.chatEndpoint || '/chat/completions';
    const endpoint = `${baseUrl}${chatPath}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (connection.capabilities.authMethod === 'bearer' && connection.api_key) {
      headers['Authorization'] = `Bearer ${connection.api_key}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'test',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;

    if (response.status === 401 || response.status === 403) {
      updateConnection(id, {
        connection_status: 'auth_failed',
        last_tested_at: new Date().toISOString(),
        last_tested_error: 'Authentication failed',
      });
      writeJsonResponse(res, { success: false, status: 'auth_failed', latencyMs, message: 'Authentication failed: invalid API key' }, 200);
      return;
    }

    if (!response.ok) {
      const errDetail = `HTTP ${response.status} ${response.statusText}`;
      updateConnection(id, {
        connection_status: 'endpoint_unavailable',
        last_tested_at: new Date().toISOString(),
        last_tested_error: errDetail,
      });
      writeJsonResponse(res, { success: false, status: 'endpoint_unavailable', latencyMs, message: `Endpoint unavailable: ${errDetail}` }, 200);
      return;
    }

    updateConnection(id, {
      connection_status: 'connected',
      last_tested_at: new Date().toISOString(),
      last_tested_error: undefined,
    });

    writeJsonResponse(res, { success: true, status: 'connected', latencyMs, message: `Connected to ${connection.name}` }, 200);
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    updateConnection(id, {
      connection_status: 'endpoint_unavailable',
      last_tested_at: new Date().toISOString(),
      last_tested_error: err.message,
    });
    writeJsonResponse(res, { success: false, status: 'endpoint_unavailable', latencyMs, message: `Connection unreachable: ${err.message}` }, 200);
  }
}

async function handleModelsProvider(req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
  const connection = getConnection(id);
  if (!connection) {
    writeJsonResponse(res, { error: 'not_found', message: `Provider connection '${id}' not found.` }, 404);
    return;
  }

  try {
    const baseUrl = connection.base_url.replace(/\/$/, '');
    const modelsPath = connection.capabilities.discoveryEndpoint || '/models';
    const modelsUrl = `${baseUrl}${modelsPath}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (connection.capabilities.authMethod === 'bearer' && connection.api_key) {
      headers['Authorization'] = `Bearer ${connection.api_key}`;
    }

    const response = await fetch(modelsUrl, { headers });

    if (!response.ok) {
      writeJsonResponse(res, { error: 'provider_error', message: `HTTP ${response.status}`, models: [] }, response.status);
      return;
    }

    const json = await response.json();
    const data: any[] = Array.isArray(json?.data) ? json.data : [];
    const models = data
      .filter((m) => m && m.id && typeof m.id === 'string')
      .map((m) => ({
        id: m.id,
        name: m.name || m.id,
        provider: connection.name,
        contextWindow: m.context_length || 128000,
        isFree: false,
        supportsTools: connection.capabilities.supportsStreaming,
        supportsStructuredOutput: false,
        supportsStreaming: connection.capabilities.supportsStreaming,
      }));

    writeJsonResponse(res, { models, isLive: true }, 200);
  } catch (err: any) {
    writeJsonResponse(res, { error: 'provider_unavailable', message: err.message, models: [] }, 502);
  }
}

// ============================================================
// SERVER
// ============================================================

const PORT = parseInt(process.env.PROXY_PORT || '3001', 10);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // Only handle /api/ai/* paths
  if (!url.pathname.startsWith('/api/ai/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found', message: 'Only /api/ai/* paths are handled by this proxy.' }));
    return;
  }

  const path = url.pathname.replace('/api/ai/', '');

  // Extract connection ID from header
  const connectionId = req.headers['x-provider-connection'] as string;

  // ─── Health (no auth required) ─────────────────────────────
  if (path === 'health' && req.method === 'GET') {
    await handleHealth(req, res);
    return;
  }

  // ─── Provider CRUD ─────────────────────────────────────────
  if (path === 'providers' && req.method === 'GET') {
    await handleListProviders(req, res);
    return;
  }

  if (path === 'providers' && req.method === 'POST') {
    await handleCreateProvider(req, res);
    return;
  }

  const providerMatch = path.match(/^providers\/([^/]+)/);
  if (providerMatch) {
    const id = providerMatch[1];

    if (req.method === 'PATCH' || req.method === 'PUT') {
      await handleUpdateProvider(req, res, id);
      return;
    }

    if (req.method === 'DELETE') {
      await handleDeleteProvider(req, res, id);
      return;
    }

    if (req.method === 'POST' && path.endsWith('/test')) {
      await handleTestProvider(req, res, id);
      return;
    }

    if (req.method === 'GET' && path.endsWith('/models')) {
      await handleModelsProvider(req, res, id);
      return;
    }
  }

  // ─── Generate (runtime request forwarding) ─────────────────
  if (path === 'generate' && req.method === 'POST') {
    if (!connectionId) {
      writeJsonResponse(res, {
        error: 'invalid_request',
        message: 'Missing X-Provider-Connection header.',
      }, 400);
      return;
    }
    await forwardRequest(req, res, connectionId, 'chat/completions');
    return;
  }

  // ─── Generic proxy forwarding ──────────────────────────────
  if (!connectionId) {
    writeJsonResponse(res, {
      error: 'invalid_request',
      message: 'Missing X-Provider-Connection header.',
    }, 400);
    return;
  }

  await forwardRequest(req, res, connectionId, path);
});

server.listen(PORT, () => {
  console.log(`AI Proxy server listening on http://localhost:${PORT}`);
  console.log(`Configured connections: ${listConnections().map(c => c.id).join(', ') || 'none (file-backed)'}`);
  console.log('Ready to proxy /api/ai/* requests.');
});

// Hot-reload connections on SIGHUP
process.on('SIGHUP', () => {
  reloadConnections();
  console.log(`Reloaded ${listConnections().length} provider connections from file.`);
});
