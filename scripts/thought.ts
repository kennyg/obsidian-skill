#!/usr/bin/env bun
/**
 * Thought CLI - Quick notes to daily journal
 *
 * Usage: bun thought.ts <message> [tags...]
 */

import { exists, mkdir } from "fs/promises";
import { join, dirname } from "path";

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
if (!VAULT_PATH) {
  console.error("Error: OBSIDIAN_VAULT_PATH not set");
  process.exit(1);
}

const DAILY_FORMAT = process.env.OBSIDIAN_DAILY_FORMAT || "Journal/%Y-%m-%d.md";

function formatTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDailyPath(): string {
  const now = new Date();
  return DAILY_FORMAT.replace("%Y", now.getFullYear().toString())
    .replace("%m", (now.getMonth() + 1).toString().padStart(2, "0"))
    .replace("%d", now.getDate().toString().padStart(2, "0"));
}

async function append(content: string): Promise<void> {
  const dailyPath = join(VAULT_PATH, formatDailyPath());

  await mkdir(dirname(dailyPath), { recursive: true });

  // Ensure file ends with newline before appending
  if (await exists(dailyPath)) {
    const file = Bun.file(dailyPath);
    const text = await file.text();
    if (text.length > 0 && !text.endsWith("\n")) {
      await Bun.write(dailyPath, text + "\n");
    }
  }

  await Bun.write(
    dailyPath,
    ((await exists(dailyPath)) ? await Bun.file(dailyPath).text() : "") + content + "\n",
  );
}

// === CLI ===

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
Thought CLI - Quick notes to daily journal

Usage: bun thought.ts <message> [tags...]

Examples:
  bun thought.ts "Great idea for the app"
  bun thought.ts "Meeting notes" meeting work
  bun thought.ts "Remember to call mom" personal reminder

Output format:
  - HH:MM <message> #tag1 #tag2

File: ${formatDailyPath()}
`);
  process.exit(0);
}

const message = args[0];
const tags = args.slice(1);
const tagStr = tags.length ? " " + tags.map((t) => `#${t}`).join(" ") : "";
const entry = `- ${formatTime()} ${message}${tagStr}`;

await append(entry);
console.log(`Added: ${entry}`);
