import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');

export interface ProviderCapabilities {
  authMethod: 'bearer' | 'none';
  chatEndpoint?: string;
  discoveryEndpoint?: string;
  supportsStreaming: boolean;
}

export interface ProviderConnection {
  id: string;
  provider_type: string;
  base_url: string;
  api_key: string;
  capabilities: ProviderCapabilities;
  name: string;
  enabled: boolean;
  connection_status: string;
  api_key_last_four?: string;
  last_tested_at?: string;
  last_tested_error?: string;
  created_at: string;
  updated_at: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConnections(): ProviderConnection[] {
  ensureDataDir();
  if (!fs.existsSync(CONNECTIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveConnections(connections: ProviderConnection[]): void {
  ensureDataDir();
  fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
}

let connections: ProviderConnection[] = loadConnections();
const connectionMap = new Map<string, ProviderConnection>(connections.map(c => [c.id, c]));

export function getConnection(connectionId: string): ProviderConnection | null {
  return connectionMap.get(connectionId) || null;
}

export function listConnections(): ProviderConnection[] {
  return [...connections];
}

export function createConnection(conn: ProviderConnection): ProviderConnection {
  connections.push(conn);
  connectionMap.set(conn.id, conn);
  saveConnections(connections);
  return conn;
}

export function updateConnection(id: string, patch: Partial<ProviderConnection>): ProviderConnection | null {
  const idx = connections.findIndex(c => c.id === id);
  if (idx === -1) return null;
  connections[idx] = {
    ...connections[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  connectionMap.set(id, connections[idx]);
  saveConnections(connections);
  return connections[idx];
}

export function deleteConnection(id: string): boolean {
  const idx = connections.findIndex(c => c.id === id);
  if (idx === -1) return false;
  connections.splice(idx, 1);
  connectionMap.delete(id);
  saveConnections(connections);
  return true;
}

export function generateId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function reloadConnections(): void {
  connections = loadConnections();
  connectionMap.clear();
  connections.forEach(c => connectionMap.set(c.id, c));
}
