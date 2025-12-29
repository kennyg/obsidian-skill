# Thought CLI Reference

Quick notes to your daily journal with optional tags.

## Usage

```bash
bun scripts/thought.ts <message> [tags...]
```

## Examples

```bash
# Simple thought
thought "Great idea for the app"

# With tags
thought "Meeting went well" meeting work
thought "Remember to call mom" personal reminder
thought "Bug in auth flow" bug backend urgent
```

## Output Format

Entries are appended to your daily note:

```markdown
- 10:25 Great idea for the app
- 10:30 Meeting went well #meeting #work
- 14:15 Remember to call mom #personal #reminder
```

## Configuration

### Daily Note Location

Set via environment variable:

```bash
export OBSIDIAN_DAILY_FORMAT="Journal/Daily/%Y-%m-%d.md"
```

Format tokens:
- `%Y` - Year (2025)
- `%m` - Month (01-12)
- `%d` - Day (01-31)

Default: `Journal/%Y-%m-%d.md`

### Examples

```bash
# Default
Journal/2025-12-29.md

# With Daily subfolder
export OBSIDIAN_DAILY_FORMAT="Journal/Daily/%Y-%m-%d.md"
# → Journal/Daily/2025-12-29.md

# Year/Month folders
export OBSIDIAN_DAILY_FORMAT="Journal/%Y/%m/%Y-%m-%d.md"
# → Journal/2025/12/2025-12-29.md
```

## Shell Alias

Add to `.zshrc` or `.bashrc`:

```bash
alias thought="bun /path/to/obsidian-skill/scripts/thought.ts"
```

## Tips

- Use consistent tags for easy searching (`#idea`, `#meeting`, `#reminder`)
- Tags become Obsidian tags, searchable and clickable
- Entries are timestamped with HH:MM format
- Works offline (filesystem-based)
