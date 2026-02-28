# Obsidian Skill

Read, write, search, and manage Obsidian vault notes without MCP overhead. Uses the native Obsidian CLI.

## Dependencies

### Required

- **[Obsidian](https://obsidian.md/)** - The note-taking app (v1.8+ for native CLI)
- **[Bun](https://bun.sh/)** - For `.ts` scripts — `curl -fsSL https://bun.sh/install | bash`

### Optional

- **[obsidian-kanban](https://github.com/mgmeyers/obsidian-kanban)** - For agent mission control boards
- **[Tasks Plugin](https://github.com/obsidian-tasks-group/obsidian-tasks)** - For task queries (used by `todo.ts`)

## Setup

```bash
# 1. Clone/copy skill to your project
cp -r obsidian-skill /path/to/your/project/.claude/skills/obsidian

# 2. Optionally set vault name (defaults to active vault)
export OBSIDIAN_VAULT="my-vault"

# 3. Test
obsidian vault
```

## Quick Test

```bash
# Vault info
obsidian vault

# List files
obsidian files

# Read a note
obsidian read path="Inbox/Tasks.md"

# Search
obsidian search query="project"

# Daily note
obsidian daily:read
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

## Agent Mission Control

A kanban board as a task queue — dispatch work to agents, let them claim and update cards, see status live in Obsidian.

```bash
# Check what's available
bun scripts/kanban.ts board-status --board "Agents/Mission-Control.md"
bun scripts/kanban.ts list --board "Agents/Mission-Control.md" --lane Ready

# Claim a task and start working
bun scripts/kanban.ts claim --board "Agents/Mission-Control.md" --id abc123def --agent claude-1

# Update status while in progress
bun scripts/kanban.ts update --board "Agents/Mission-Control.md" --id abc123def --status blocked --note "Need API key"

# Finish
bun scripts/kanban.ts complete --board "Agents/Mission-Control.md" --id abc123def
bun scripts/kanban.ts fail --board "Agents/Mission-Control.md" --id abc123def --reason "Build failed"

# Dispatch new tasks
bun scripts/kanban.ts add-task --board "Agents/Mission-Control.md" --title "Refactor auth" --lane Ready --priority high
```

Cards track agent, status, priority, and timestamps as inline metadata badges:

```markdown
- [ ] Refactor auth module [agent::claude-1] [status::in-progress] [priority::high] #agent-task #in-progress ^abc123def
```

Lanes: `Backlog → Ready → In Progress → Blocked → Done → Failed`

Enable the CSS snippet for color-coded status borders:

```bash
obsidian snippet:enable name=agent-mission-control
```

## Why Not MCP?

The native Obsidian CLI ships with Obsidian itself — no plugins, no servers, no API keys. This skill gives you:

1. **Zero setup** - No Local REST API plugin, no API key, no MCP server process
2. **Full vault access** - Read, write, search, commands, snippets, plugins
3. **Typed scripts** - Bun + TypeScript wrappers for common workflows
4. **Simpler debugging** - Direct CLI calls are easy to trace and reproduce

## Shell Aliases

Add to `.zshrc` or `.bashrc`:

```bash
alias oncall="bun /path/to/obsidian-skill/scripts/oncall.ts"
alias todo="bun /path/to/obsidian-skill/scripts/todo.ts"
alias thought="bun /path/to/obsidian-skill/scripts/thought.ts"
alias kanban="bun /path/to/obsidian-skill/scripts/kanban.ts"
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

## References

- [Obsidian CLI](references/obsidian-cli.md) - Native CLI command reference
- [Thought](references/thought.md) - Quick notes to daily journal
- [Todo](references/todo.md) - Task management with Obsidian Tasks format
- [Oncall](references/oncall.md) - Incident tracking and shift management
- [Kanban](references/kanban.md) - Agent mission control and task dispatch

## Acknowledgements

Inspired by [Connect Claude AI with Obsidian](https://dev.to/sroy8091/connect-claude-ai-with-obsidian-a-game-changer-for-knowledge-management-25o2) by Sumit Roy.

## License

MIT
