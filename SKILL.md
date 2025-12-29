---
name: obsidian
description: "Read, write, search, and manage Obsidian vault notes. Use when: (1) Reading/writing markdown notes, (2) Searching vault content, (3) Managing daily/periodic notes, (4) Executing Obsidian commands. Supports both direct filesystem access and Local REST API."
---

# Obsidian Vault Integration

## Configuration

Set these environment variables (recommended via `.envrc` with direnv):

```bash
# .envrc
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
export OBSIDIAN_API_KEY="your-api-key-here"

# Optional REST API config
export OBSIDIAN_HOST="127.0.0.1"
export OBSIDIAN_PORT="27124"
export OBSIDIAN_HTTPS="true"
```

Get your API key from: Obsidian Settings → Community Plugins → Local REST API → Copy API Key

## Access Methods

Two methods available, choose based on context:

1. **Direct Filesystem** - When vault path accessible (fastest, no dependencies)
2. **Local REST API** - When Obsidian app features needed (search, commands, active file)

## Method 1: Direct Filesystem Access

Use when Claude has filesystem tools and `$OBSIDIAN_VAULT_PATH` is set.

### Read Note
```bash
cat "$OBSIDIAN_VAULT_PATH/folder/note.md"
```

### Write/Create Note
```bash
cat > "$OBSIDIAN_VAULT_PATH/folder/note.md" << 'EOF'
---
title: My Note
tags: [tag1, tag2]
created: 2025-01-15
---

# Content here
EOF
```

### Search Notes
```bash
# Find by filename
find "$OBSIDIAN_VAULT_PATH" -name "*.md" | xargs grep -l "search term"

# Search content with context
grep -r -n "search term" "$OBSIDIAN_VAULT_PATH" --include="*.md"

# Find by tag in frontmatter
grep -r -l "tags:.*mytag" "$OBSIDIAN_VAULT_PATH" --include="*.md"
```

### List Structure
```bash
find "$OBSIDIAN_VAULT_PATH" -name "*.md" -type f | head -50
```

## Method 2: Local REST API

Requires [Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api). Use when needing: active file, commands, Dataview queries, or when filesystem unavailable.

**Base URL**: `https://127.0.0.1:27124` (HTTPS) or `http://127.0.0.1:27123` (HTTP)

### Core Endpoints

#### List Vault Files
```bash
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/vault/"
```

#### Read Note
```bash
# As markdown
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/vault/path/to/note.md"

# As JSON with metadata
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Accept: application/vnd.olrapi.note+json" \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

#### Create/Update Note
```bash
curl -k -X PUT -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -d "# New Note Content" \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

#### Append to Note
```bash
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -d "## Appended Section" \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

#### Patch Note (insert at heading/block/frontmatter)
```bash
# Append under a heading
curl -k -X PATCH -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -H "Operation: append" \
  -H "Target-Type: heading" \
  -H "Target: Section Name" \
  -d "Content to insert" \
  "https://127.0.0.1:27124/vault/path/to/note.md"

# Update frontmatter field
curl -k -X PATCH -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Operation: replace" \
  -H "Target-Type: frontmatter" \
  -H "Target: status" \
  -d '"completed"' \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

#### Delete Note
```bash
curl -k -X DELETE -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

### Active File Operations

```bash
# Get currently open file
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/active/"

# Append to active file
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -d "New content" \
  "https://127.0.0.1:27124/active/"
```

### Periodic Notes

```bash
# Get today's daily note
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/periodic/daily/"

# Get specific date's note
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/periodic/daily/2025/1/15/"

# Append to daily note (creates if needed)
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -d "- Task completed at $(date)" \
  "https://127.0.0.1:27124/periodic/daily/"
```

Periods: `daily`, `weekly`, `monthly`, `quarterly`, `yearly`

### Oncall Tracking

Lightweight incident logging with multi-day shift support using Bun CLI.

```bash
# Start/end oncall shift
bun scripts/oncall.ts start
bun scripts/oncall.ts end

# Log incidents with tags
bun scripts/oncall.ts log "PagerDuty alert for db-prod-01" incident database

# Log resolutions (auto-adds #resolved tag)
bun scripts/oncall.ts resolve "Increased connection pool" database

# View current shift summary with stats
bun scripts/oncall.ts summary

# Search oncall logs
bun scripts/oncall.ts search database
bun scripts/oncall.ts search incident

# List recent shifts
bun scripts/oncall.ts list
```

File structure:

```
Journal/Oncall/
├── current-shift.md              # Active shift (created by start)
└── archive/
    ├── 2025-12-29.md             # Single-day shift
    └── 2025-12-25-to-2025-12-27.md  # Multi-day shift
```

Shift format with frontmatter:

```markdown
---
startDate: 2025-12-29
startTime: 09:00
endDate: 2025-12-29
endTime: 17:00
status: ended
---

## Oncall Shift (2025-12-29)
> Started: 09:00
- 09:15 PagerDuty alert for db-prod-01 #incident #database
- 09:45 ✓ Increased connection pool #resolved #database
> Ended: 17:00
```

Query shifts with Dataview:

```bash
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: application/vnd.olrapi.dataview.dql+txt" \
  -d 'TABLE startDate, endDate FROM "Journal/Oncall/archive" WHERE status = "ended" SORT startDate DESC' \
  "https://127.0.0.1:27124/search/"
```

### Search

#### Simple Text Search
```bash
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/search/simple/?query=search+term&contextLength=100"
```

#### JsonLogic Search
```bash
# Find notes with specific tag
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: application/vnd.olrapi.jsonlogic+json" \
  -d '{"in": ["project", {"var": "tags"}]}' \
  "https://127.0.0.1:27124/search/"

# Find by frontmatter field
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: application/vnd.olrapi.jsonlogic+json" \
  -d '{"==": [{"var": "frontmatter.status"}, "active"]}' \
  "https://127.0.0.1:27124/search/"
```

#### Dataview Query (requires Dataview plugin)
```bash
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: application/vnd.olrapi.dataview.dql+txt" \
  -d 'TABLE file.mtime AS "Modified" FROM "Projects" SORT file.mtime DESC LIMIT 10' \
  "https://127.0.0.1:27124/search/"
```

### Commands

```bash
# List available commands
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/commands/"

# Execute command
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/commands/daily-notes:goto-today/"
```

### Open File in Obsidian UI
```bash
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/open/path/to/note.md"
```

## Programmatic Access

See `scripts/obsidian-client.ts` for a typed Bun/TypeScript client.

```typescript
import { ObsidianClient } from './scripts/obsidian-client.ts';

const client = new ObsidianClient(); // Uses OBSIDIAN_API_KEY env var
const note = await client.getNote('Projects/my-project.md');
await client.appendToDaily('- Completed task');
```

## Decision Guide

| Need | Method |
|------|--------|
| Fast read/write | Filesystem |
| Search by tag/frontmatter | REST API (JsonLogic) |
| Dataview queries | REST API |
| Active file operations | REST API |
| Daily/periodic notes | REST API |
| Execute Obsidian commands | REST API |
| Oncall/incident tracking | `bun scripts/oncall.ts` |
| No Obsidian running | Filesystem |
