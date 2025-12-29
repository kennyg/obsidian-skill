/**
 * Obsidian Client - REST API + Filesystem Access
 * 
 * Environment variables (set via .envrc):
 *   OBSIDIAN_API_KEY      - API key from Local REST API plugin
 *   OBSIDIAN_VAULT_PATH   - Path to vault (for filesystem operations)
 *   OBSIDIAN_HOST         - API host (default: 127.0.0.1)
 *   OBSIDIAN_PORT         - API port (default: 27124)
 *   OBSIDIAN_HTTPS        - Use HTTPS (default: true)
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export interface NoteJson {
  path: string;
  content: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
}

export interface SearchMatch {
  match: { start: number; end: number };
  context: string;
}

export interface SearchResult {
  filename: string;
  score?: number;
  matches?: SearchMatch[];
  result?: unknown;
}

export interface Command {
  id: string;
  name: string;
}

export type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type PatchOperation = 'append' | 'prepend' | 'replace';
export type TargetType = 'heading' | 'block' | 'frontmatter';

export interface PatchOptions {
  operation: PatchOperation;
  targetType: TargetType;
  target: string;
  targetDelimiter?: string;
  createIfMissing?: boolean;
}

export interface ClientOptions {
  apiKey?: string;
  vaultPath?: string;
  host?: string;
  port?: number;
  https?: boolean;
}

export class ObsidianClient {
  private baseUrl: string;
  private apiKey: string;
  private vaultPath: string | undefined;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.OBSIDIAN_API_KEY || '';
    this.vaultPath = options.vaultPath || process.env.OBSIDIAN_VAULT_PATH;
    
    const host = options.host || process.env.OBSIDIAN_HOST || '127.0.0.1';
    const https = options.https ?? (process.env.OBSIDIAN_HTTPS !== 'false');
    const port = options.port || Number(process.env.OBSIDIAN_PORT) || (https ? 27124 : 27123);
    this.baseUrl = `${https ? 'https' : 'http'}://${host}:${port}`;
  }

  // === Filesystem Operations (fast, no API) ===

  private getFullPath(notePath: string): string {
    if (!this.vaultPath) {
      throw new Error('OBSIDIAN_VAULT_PATH not set');
    }
    return join(this.vaultPath, notePath);
  }

  async fsRead(notePath: string): Promise<string> {
    return readFile(this.getFullPath(notePath), 'utf-8');
  }

  async fsWrite(notePath: string, content: string): Promise<void> {
    const fullPath = this.getFullPath(notePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  }

  async fsList(directory = ''): Promise<string[]> {
    const fullPath = this.getFullPath(directory);
    const entries = await readdir(fullPath, { withFileTypes: true, recursive: true });
    return entries
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => join(e.parentPath || e.path || '', e.name).replace(this.vaultPath! + '/', ''));
  }

  // === REST API Operations ===

  private async request<T>(
    path: string,
    options: RequestInit & { accept?: string } = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('OBSIDIAN_API_KEY not set');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      ...(options.headers as Record<string, string>),
    };

    if (options.accept) {
      headers.Accept = options.accept;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      // @ts-expect-error - Bun supports this for self-signed certs
      tls: { rejectUnauthorized: false },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Obsidian API error ${response.status}: ${error}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('application/vnd.olrapi')) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as T;
  }

  // === Vault Files ===

  async listFiles(directory = ''): Promise<{ files: string[] }> {
    const path = directory ? `/vault/${directory}/` : '/vault/';
    return this.request<{ files: string[] }>(path);
  }

  async getNote(filePath: string): Promise<string> {
    return this.request<string>(`/vault/${filePath}`);
  }

  async getNoteWithMetadata(filePath: string): Promise<NoteJson> {
    return this.request<NoteJson>(`/vault/${filePath}`, {
      accept: 'application/vnd.olrapi.note+json',
    });
  }

  async createOrUpdateNote(filePath: string, content: string): Promise<void> {
    await this.request(`/vault/${filePath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown' },
      body: content,
    });
  }

  async appendToNote(filePath: string, content: string): Promise<void> {
    await this.request(`/vault/${filePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/markdown' },
      body: content,
    });
  }

  async patchNote(filePath: string, content: string, options: PatchOptions): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'text/markdown',
      Operation: options.operation,
      'Target-Type': options.targetType,
      Target: options.target,
    };

    if (options.targetDelimiter) {
      headers['Target-Delimiter'] = options.targetDelimiter;
    }
    if (options.createIfMissing) {
      headers['Create-Target-If-Missing'] = 'true';
    }

    await this.request(`/vault/${filePath}`, {
      method: 'PATCH',
      headers,
      body: content,
    });
  }

  async deleteNote(filePath: string): Promise<void> {
    await this.request(`/vault/${filePath}`, { method: 'DELETE' });
  }

  // === Active File ===

  async getActiveFile(): Promise<string> {
    return this.request<string>('/active/');
  }

  async getActiveFileWithMetadata(): Promise<NoteJson> {
    return this.request<NoteJson>('/active/', {
      accept: 'application/vnd.olrapi.note+json',
    });
  }

  async appendToActiveFile(content: string): Promise<void> {
    await this.request('/active/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/markdown' },
      body: content,
    });
  }

  // === Periodic Notes ===

  async getPeriodicNote(period: Period): Promise<string> {
    return this.request<string>(`/periodic/${period}/`);
  }

  async getPeriodicNoteForDate(
    period: Period,
    year: number,
    month: number,
    day: number
  ): Promise<string> {
    return this.request<string>(`/periodic/${period}/${year}/${month}/${day}/`);
  }

  async appendToPeriodicNote(period: Period, content: string): Promise<void> {
    await this.request(`/periodic/${period}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/markdown' },
      body: content,
    });
  }

  async appendToDaily(content: string): Promise<void> {
    return this.appendToPeriodicNote('daily', content);
  }

  async getDaily(): Promise<string> {
    return this.getPeriodicNote('daily');
  }

  // === Search ===

  async searchSimple(query: string, contextLength = 100): Promise<SearchResult[]> {
    return this.request<SearchResult[]>(
      `/search/simple/?query=${encodeURIComponent(query)}&contextLength=${contextLength}`,
      { method: 'POST' }
    );
  }

  async searchJsonLogic(query: object): Promise<SearchResult[]> {
    return this.request<SearchResult[]>('/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.olrapi.jsonlogic+json' },
      body: JSON.stringify(query),
    });
  }

  async searchByTag(tag: string): Promise<SearchResult[]> {
    return this.searchJsonLogic({ in: [tag, { var: 'tags' }] });
  }

  async searchByFrontmatter(field: string, value: unknown): Promise<SearchResult[]> {
    return this.searchJsonLogic({ '==': [{ var: `frontmatter.${field}` }, value] });
  }

  async searchDataview(dql: string): Promise<SearchResult[]> {
    return this.request<SearchResult[]>('/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.olrapi.dataview.dql+txt' },
      body: dql,
    });
  }

  // === Commands ===

  async listCommands(): Promise<{ commands: Command[] }> {
    return this.request<{ commands: Command[] }>('/commands/');
  }

  async executeCommand(commandId: string): Promise<void> {
    await this.request(`/commands/${commandId}/`, { method: 'POST' });
  }

  // === Utility ===

  async openInObsidian(filePath: string, newLeaf = false): Promise<void> {
    const query = newLeaf ? '?newLeaf=true' : '';
    await this.request(`/open/${filePath}${query}`, { method: 'POST' });
  }

  async getStatus(): Promise<{ ok: string; authenticated: boolean; versions: { self: string; obsidian: string } }> {
    return this.request('/');
  }
}

// === CLI Usage ===

if (import.meta.main) {
  const client = new ObsidianClient();

  const [command, ...args] = process.argv.slice(2);

  const commands: Record<string, () => Promise<void>> = {
    // Filesystem commands
    async 'fs-read'() {
      if (!args[0]) throw new Error('Usage: fs-read <path>');
      console.log(await client.fsRead(args[0]));
    },
    async 'fs-write'() {
      if (!args[0] || !args[1]) throw new Error('Usage: fs-write <path> <content>');
      await client.fsWrite(args[0], args.slice(1).join(' '));
      console.log(`Written to ${args[0]}`);
    },
    async 'fs-list'() {
      const files = await client.fsList(args[0]);
      files.forEach(f => console.log(f));
    },

    // API commands
    async status() {
      console.log(await client.getStatus());
    },
    async list() {
      console.log(await client.listFiles(args[0]));
    },
    async read() {
      if (!args[0]) throw new Error('Usage: read <path>');
      console.log(await client.getNote(args[0]));
    },
    async meta() {
      if (!args[0]) throw new Error('Usage: meta <path>');
      console.log(JSON.stringify(await client.getNoteWithMetadata(args[0]), null, 2));
    },
    async search() {
      if (!args[0]) throw new Error('Usage: search <query>');
      console.log(JSON.stringify(await client.searchSimple(args.join(' ')), null, 2));
    },
    async daily() {
      console.log(await client.getDaily());
    },
    async 'daily-append'() {
      if (!args[0]) throw new Error('Usage: daily-append <content>');
      await client.appendToDaily(args.join(' '));
      console.log('Appended to daily note');
    },
    async commands() {
      console.log(JSON.stringify(await client.listCommands(), null, 2));
    },
    async exec() {
      if (!args[0]) throw new Error('Usage: exec <command-id>');
      await client.executeCommand(args[0]);
      console.log(`Executed: ${args[0]}`);
    },
    async env() {
      console.log('OBSIDIAN_VAULT_PATH:', process.env.OBSIDIAN_VAULT_PATH || '<not set>');
      console.log('OBSIDIAN_API_KEY:', process.env.OBSIDIAN_API_KEY ? '<set>' : '<not set>');
      console.log('OBSIDIAN_HOST:', process.env.OBSIDIAN_HOST || '127.0.0.1');
      console.log('OBSIDIAN_PORT:', process.env.OBSIDIAN_PORT || '27124');
      console.log('OBSIDIAN_HTTPS:', process.env.OBSIDIAN_HTTPS || 'true');
    },
  };

  if (!command || !commands[command]) {
    console.log(`
Obsidian CLI - Usage: bun obsidian-client.ts <command> [args]

Environment (set via .envrc):
  OBSIDIAN_VAULT_PATH   Path to vault (for fs-* commands)
  OBSIDIAN_API_KEY      API key (for REST API commands)

Filesystem Commands:
  fs-read <path>        Read note via filesystem
  fs-write <path> <txt> Write note via filesystem
  fs-list [dir]         List .md files

REST API Commands:
  status                Check API connection
  list [dir]            List files in vault
  read <path>           Read note content
  meta <path>           Read note with metadata
  search <query>        Simple text search
  daily                 Get today's daily note
  daily-append <text>   Append to daily note
  commands              List available commands
  exec <id>             Execute command
  env                   Show configuration
`);
    process.exit(1);
  }

  try {
    await commands[command]();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
