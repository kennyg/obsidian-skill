#!/usr/bin/env bun
/**
 * Oncall Tracking CLI
 *
 * Lightweight incident logging to Obsidian vault.
 * Uses a single active shift file that gets archived when ended.
 *
 * Usage: bun oncall.ts <command> [args]
 */

import { ObsidianClient } from './obsidian-client.ts';
import { exists, mkdir } from 'fs/promises';
import { join } from 'path';

const ONCALL_DIR = 'Journal/Oncall';
const CURRENT_SHIFT = `${ONCALL_DIR}/current-shift.md`;
const ARCHIVE_DIR = `${ONCALL_DIR}/archive`;

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatDate(): string {
  return new Date().toISOString().split('T')[0];
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, string> = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      frontmatter[key.trim()] = valueParts.join(':').trim();
    }
  });

  return { frontmatter, body: match[2] };
}

function createFrontmatter(meta: Record<string, string>): string {
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

class OncallCLI {
  private client: ObsidianClient;
  private vaultPath: string;

  constructor() {
    this.client = new ObsidianClient();
    this.vaultPath = process.env.OBSIDIAN_VAULT_PATH || '';
    if (!this.vaultPath) {
      throw new Error('OBSIDIAN_VAULT_PATH not set');
    }
  }

  private getFullPath(notePath: string): string {
    return join(this.vaultPath, notePath);
  }

  private async shiftExists(): Promise<boolean> {
    return exists(this.getFullPath(CURRENT_SHIFT));
  }

  private async ensureDir(dir: string): Promise<void> {
    const fullPath = this.getFullPath(dir);
    await mkdir(fullPath, { recursive: true });
  }

  async start(): Promise<void> {
    if (await this.shiftExists()) {
      console.error('Error: Active shift already exists. Run "oncall end" first.');
      process.exit(1);
    }

    await this.ensureDir(ONCALL_DIR);

    const date = formatDate();
    const time = formatTime();

    const content = createFrontmatter({
      startDate: date,
      startTime: time,
      status: 'active',
    }) + `\n## Oncall Shift (${date})\n> Started: ${time}\n`;

    await this.client.fsWrite(CURRENT_SHIFT, content);
    console.log(`Oncall shift started at ${time}`);
  }

  async log(message: string, tags: string[]): Promise<void> {
    if (!(await this.shiftExists())) {
      console.error('Error: No active shift. Run "oncall start" first.');
      process.exit(1);
    }

    const time = formatTime();
    const tagStr = tags.length ? ' ' + tags.map(t => `#${t}`).join(' ') : '';
    const entry = `- ${time} ${message}${tagStr}\n`;

    const content = await this.client.fsRead(CURRENT_SHIFT);
    await this.client.fsWrite(CURRENT_SHIFT, content + entry);
    console.log(`Logged: ${entry.trim()}`);
  }

  async resolve(message: string, tags: string[]): Promise<void> {
    if (!(await this.shiftExists())) {
      console.error('Error: No active shift. Run "oncall start" first.');
      process.exit(1);
    }

    const time = formatTime();
    const tagStr = '#resolved' + (tags.length ? ' ' + tags.map(t => `#${t}`).join(' ') : '');
    const entry = `- ${time} ✓ ${message} ${tagStr}\n`;

    const content = await this.client.fsRead(CURRENT_SHIFT);
    await this.client.fsWrite(CURRENT_SHIFT, content + entry);
    console.log(`Logged: ${entry.trim()}`);
  }

  async end(): Promise<void> {
    if (!(await this.shiftExists())) {
      console.error('Error: No active shift to end.');
      process.exit(1);
    }

    const content = await this.client.fsRead(CURRENT_SHIFT);
    const { frontmatter, body } = parseFrontmatter(content);

    const endDate = formatDate();
    const endTime = formatTime();

    // Update frontmatter
    const newFrontmatter = createFrontmatter({
      ...frontmatter,
      endDate,
      endTime,
      status: 'ended',
    });

    // Add end marker to body
    const newBody = body + `> Ended: ${endTime}\n`;
    const finalContent = newFrontmatter + newBody;

    // Create archive filename
    await this.ensureDir(ARCHIVE_DIR);
    const startDate = frontmatter.startDate || endDate;
    const archiveFile = startDate === endDate
      ? `${ARCHIVE_DIR}/${startDate}.md`
      : `${ARCHIVE_DIR}/${startDate}-to-${endDate}.md`;

    // Check if archive file exists (multiple shifts same day)
    let archivePath = archiveFile;
    let counter = 1;
    while (await exists(this.getFullPath(archivePath))) {
      archivePath = archiveFile.replace('.md', `-${++counter}.md`);
    }

    // Move to archive
    await this.client.fsWrite(archivePath, finalContent);
    await Bun.file(this.getFullPath(CURRENT_SHIFT)).delete();

    console.log(`Oncall shift ended at ${endTime}`);
    console.log(`Archived to: ${archivePath}`);
  }

  async summary(): Promise<void> {
    if (!(await this.shiftExists())) {
      console.log('No active shift.');
      return;
    }

    const content = await this.client.fsRead(CURRENT_SHIFT);
    const { body } = parseFrontmatter(content);

    console.log('=== Oncall Summary ===');
    console.log(body.trim());
    console.log('');

    // Count incidents and resolutions
    const incidents = (body.match(/#incident/g) || []).length;
    const resolved = (body.match(/#resolved/g) || []).length;
    console.log(`Incidents: ${incidents} | Resolved: ${resolved}`);
  }

  async search(query: string): Promise<void> {
    const lowerQuery = query.toLowerCase();
    let found = false;

    // Search in current shift if exists
    if (await this.shiftExists()) {
      const content = await this.client.fsRead(CURRENT_SHIFT);
      const lines = content.split('\n').filter(l =>
        l.toLowerCase().includes(lowerQuery) && l.startsWith('- ')
      );
      if (lines.length) {
        found = true;
        console.log('=== Current Shift ===');
        lines.forEach(l => console.log(l));
        console.log('');
      }
    }

    // Search archive via filesystem for cleaner results
    try {
      const archiveFiles = await this.client.fsList(ARCHIVE_DIR);
      for (const file of archiveFiles.sort().reverse()) {
        const content = await this.client.fsRead(file);
        const lines = content.split('\n').filter(l =>
          l.toLowerCase().includes(lowerQuery) && l.startsWith('- ')
        );
        if (lines.length) {
          found = true;
          const filename = file.replace(ARCHIVE_DIR + '/', '');
          console.log(`=== ${filename} ===`);
          lines.forEach(l => console.log(l));
          console.log('');
        }
      }
    } catch {
      // Archive doesn't exist yet
    }

    if (!found) {
      console.log('No matches found.');
    }
  }

  async list(): Promise<void> {
    console.log('=== Oncall Shifts ===');

    if (await this.shiftExists()) {
      const content = await this.client.fsRead(CURRENT_SHIFT);
      const { frontmatter } = parseFrontmatter(content);
      console.log(`* current-shift.md (active since ${frontmatter.startDate} ${frontmatter.startTime})`);
    }

    try {
      const archivePath = this.getFullPath(ARCHIVE_DIR);
      if (await exists(archivePath)) {
        const files = await this.client.fsList(ARCHIVE_DIR);
        files.sort().reverse().slice(0, 10).forEach(f => {
          console.log(`  ${f.replace(ARCHIVE_DIR + '/', '')}`);
        });
        if (files.length > 10) {
          console.log(`  ... and ${files.length - 10} more`);
        }
      }
    } catch {
      // Archive doesn't exist yet
    }
  }
}

// === CLI Entry Point ===

const cli = new OncallCLI();
const [command, ...args] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
  async start() {
    await cli.start();
  },

  async log() {
    if (!args[0]) {
      console.error('Usage: oncall log <message> [tags...]');
      process.exit(1);
    }
    const message = args[0];
    const tags = args.slice(1);
    await cli.log(message, tags);
  },

  async resolve() {
    if (!args[0]) {
      console.error('Usage: oncall resolve <message> [tags...]');
      process.exit(1);
    }
    const message = args[0];
    const tags = args.slice(1);
    await cli.resolve(message, tags);
  },

  async end() {
    await cli.end();
  },

  async summary() {
    await cli.summary();
  },

  async search() {
    if (!args[0]) {
      console.error('Usage: oncall search <query>');
      process.exit(1);
    }
    await cli.search(args.join(' '));
  },

  async list() {
    await cli.list();
  },
};

if (!command || !commands[command]) {
  console.log(`
Oncall Tracking CLI - Usage: bun oncall.ts <command> [args]

Commands:
  start                    Start a new oncall shift
  log <msg> [tags...]      Log an incident (e.g., oncall log "Alert fired" incident database)
  resolve <msg> [tags...]  Log a resolution (auto-adds #resolved)
  end                      End current shift and archive
  summary                  Show current shift summary
  search <query>           Search oncall logs
  list                     List recent shifts

Files:
  Journal/Oncall/current-shift.md    Active shift
  Journal/Oncall/archive/            Completed shifts

Examples:
  bun oncall.ts start
  bun oncall.ts log "PagerDuty alert for db-prod-01" incident database
  bun oncall.ts resolve "Increased connection pool" database
  bun oncall.ts end
`);
  process.exit(1);
}

try {
  await commands[command]();
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
