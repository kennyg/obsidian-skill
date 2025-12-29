# Obsidian Skill

Read, write, search, and manage Obsidian vault notes without MCP overhead. Direct filesystem access + REST API.

## Dependencies

### Required

- **[Obsidian](https://obsidian.md/)** - The note-taking app
- **[Local REST API Plugin](https://github.com/coddingtonbear/obsidian-local-rest-api)** - Exposes vault via HTTP API
  - Install: Obsidian → Settings → Community Plugins → Browse → "Local REST API"
  - Get API key: Settings → Local REST API → Copy API Key
- **[direnv](https://direnv.net/)** - Auto-load environment variables
  - Install: `brew install direnv` (macOS) or [see docs](https://direnv.net/docs/installation.html)
  - Setup: Add `eval "$(direnv hook zsh)"` to your `.zshrc`

### Optional (for enhanced features)

- **[Dataview Plugin](https://github.com/blacksmithgu/obsidian-dataview)** - For Dataview DQL queries via API
- **[Periodic Notes Plugin](https://github.com/liamcain/obsidian-periodic-notes)** - For daily/weekly/monthly notes API
- **[Templater Plugin](https://github.com/SilentVoid13/Templater)** - For template execution
- **[Tasks Plugin](https://github.com/obsidian-tasks-group/obsidian-tasks)** - For task queries (used by `todo.ts`)

### For Scripts

| Script               | Requires                                                             |
| -------------------- | -------------------------------------------------------------------- |
| `obsidian-client.ts` | [Bun](https://bun.sh/) - `curl -fsSL https://bun.sh/install \| bash` |
| `obsidian.sh`        | `curl`, `jq` - `brew install jq`                                     |

## Setup

```bash
# 1. Clone/copy skill to your project
cp -r obsidian-skill /path/to/your/project/.claude/skills/obsidian

# 2. Configure environment
cp .envrc.example .envrc
# Edit .envrc with your vault path and API key

# 3. Allow direnv
direnv allow

# 4. Test
./scripts/obsidian.sh status
# or
bun scripts/obsidian-client.ts status
```

## Quick Test

```bash
# Check connection
./scripts/obsidian.sh status

# List vault files
./scripts/obsidian.sh list

# Read today's daily note
./scripts/obsidian.sh daily

# Search
./scripts/obsidian.sh search "project"

# Filesystem (no API needed)
./scripts/obsidian.sh fs-list
```

## Oncall Tracking

Lightweight incident logging with support for multi-day shifts.

```bash
# Start/end shifts
bun scripts/oncall.ts start
bun scripts/oncall.ts end

# Log incidents and resolutions
bun scripts/oncall.ts log "PagerDuty alert for db-prod-01" incident database
bun scripts/oncall.ts resolve "Increased connection pool" database

# Search and summarize
bun scripts/oncall.ts summary
bun scripts/oncall.ts search incident
bun scripts/oncall.ts list
```

Files:

```
Journal/Oncall/
├── current-shift.md          # Active shift
└── archive/
    ├── 2025-12-29.md         # Single-day shift
    └── 2025-12-25-to-2025-12-27.md  # Multi-day shift
```

Archived shifts include frontmatter for querying:

```yaml
---
startDate: 2025-12-29
startTime: 09:00
endDate: 2025-12-29
endTime: 17:00
status: ended
---
```

Query with Dataview:

```dataview
TABLE startDate, endDate
FROM "Journal/Oncall/archive"
WHERE status = "ended"
SORT startDate DESC
```

## Todo Tracking

Task management using [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) format.

```bash
# Add tasks with tags, priority, and due dates
bun scripts/todo.ts add "Review PR" work --due tomorrow --priority high
bun scripts/todo.ts add "Buy groceries" personal errands

# Complete or delete tasks by number or search
bun scripts/todo.ts done 1
bun scripts/todo.ts done "PR"
bun scripts/todo.ts delete 2

# List and filter
bun scripts/todo.ts list
bun scripts/todo.ts list work
bun scripts/todo.ts all
```

Tasks are stored in `Inbox/Tasks.md` (configurable via `OBSIDIAN_TODO_FILE`):

```markdown
- [ ] Review PR #work ⏫ 📅 2025-12-30 ➕ 2025-12-29
- [ ] Buy groceries #personal #errands ➕ 2025-12-29
- [x] Old task #done ➕ 2025-12-28 ✅ 2025-12-29
```

## Why Not MCP?

The [obsidian-mcp-tools](https://github.com/jacksteamdev/obsidian-mcp-tools) plugin is just a thin wrapper around the Local REST API. This skill gives you:

1. **Direct API access** - No MCP server process to run
2. **Filesystem fallback** - Works even when Obsidian isn't running
3. **Typed client** - Full TypeScript/Bun client with autocomplete
4. **Simpler debugging** - Direct HTTP calls are easier to trace

## Shell Aliases

Add to `.zshrc` or `.bashrc`:

```bash
alias oncall="bun /path/to/obsidian-skill/scripts/oncall.ts"
alias todo="bun /path/to/obsidian-skill/scripts/todo.ts"
alias thought="bun /path/to/obsidian-skill/scripts/thought.ts"
```

Usage:

```bash
# Quick thoughts to daily note
thought "Great idea for the app"
thought "Meeting notes" meeting work

# Task management
todo add "Review PR" work --due tomorrow --priority high
todo done 1
todo list

# Oncall tracking
oncall start
oncall log "Server alert" incident
oncall end
```

## Acknowledgements

Inspired by [Connect Claude AI with Obsidian](https://dev.to/sroy8091/connect-claude-ai-with-obsidian-a-game-changer-for-knowledge-management-25o2) by Sumit Roy.

## License

MIT
