# Obsidian Local REST API Reference

Base URL: `https://127.0.0.1:27124` (HTTPS) or `http://127.0.0.1:27123` (HTTP)

Requires [Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api).

## Endpoints Summary

| Method | Endpoint                          | Description                            |
| ------ | --------------------------------- | -------------------------------------- |
| GET    | `/`                               | Server status                          |
| GET    | `/vault/`                         | List root files                        |
| GET    | `/vault/{dir}/`                   | List directory files                   |
| GET    | `/vault/{path}`                   | Read file                              |
| PUT    | `/vault/{path}`                   | Create/update file                     |
| POST   | `/vault/{path}`                   | Append to file                         |
| PATCH  | `/vault/{path}`                   | Patch file (heading/block/frontmatter) |
| DELETE | `/vault/{path}`                   | Delete file                            |
| GET    | `/active/`                        | Get active file                        |
| POST   | `/active/`                        | Append to active file                  |
| PATCH  | `/active/`                        | Patch active file                      |
| GET    | `/periodic/{period}/`             | Get current periodic note              |
| GET    | `/periodic/{period}/{y}/{m}/{d}/` | Get specific date note                 |
| POST   | `/periodic/{period}/`             | Append to periodic note                |
| POST   | `/search/simple/?query=...`       | Simple text search                     |
| POST   | `/search/`                        | JsonLogic or Dataview search           |
| GET    | `/commands/`                      | List commands                          |
| POST   | `/commands/{id}/`                 | Execute command                        |
| POST   | `/open/{path}`                    | Open file in Obsidian                  |

## Headers

**Required**: `Authorization: Bearer <api-key>`

**Optional (for reads)**:

- `Accept: application/vnd.olrapi.note+json` - Get JSON with metadata

**For PATCH**:

- `Operation: append|prepend|replace`
- `Target-Type: heading|block|frontmatter`
- `Target: <target-name>`
- `Target-Delimiter: ::` (for nested headings)

**For Search**:

- `Content-Type: application/vnd.olrapi.jsonlogic+json` - JsonLogic query
- `Content-Type: application/vnd.olrapi.dataview.dql+txt` - Dataview DQL

## JsonLogic Search Examples

```json
// Find notes with tag
{"in": ["mytag", {"var": "tags"}]}

// Find by frontmatter field
{"==": [{"var": "frontmatter.status"}, "active"]}

// Glob pattern match
{"glob": ["Projects/*", {"var": "path"}]}

// Regex match
{"regexp": [".*\\.md$", {"var": "path"}]}

// Complex query
{"and": [
  {"in": ["project", {"var": "tags"}]},
  {"==": [{"var": "frontmatter.status"}, "active"]}
]}
```

## Note Metadata (NoteJson)

```json
{
  "path": "folder/note.md",
  "content": "# Note content...",
  "tags": ["tag1", "tag2"],
  "frontmatter": {
    "title": "My Note",
    "created": "2025-01-15"
  },
  "stat": {
    "ctime": 1705334400000,
    "mtime": 1705420800000,
    "size": 1234
  }
}
```

## Curl Examples

### Read Note

```bash
# As markdown
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/vault/path/to/note.md"

# As JSON with metadata
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Accept: application/vnd.olrapi.note+json" \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

### Create/Update Note

```bash
curl -k -X PUT -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -d "# New Note Content" \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

### Append to Note

```bash
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -d "## Appended Section" \
  "https://127.0.0.1:27124/vault/path/to/note.md"
```

### Patch Note

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

### Periodic Notes

```bash
# Get today's daily note
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/periodic/daily/"

# Append to daily note
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown" \
  -d "- Task completed" \
  "https://127.0.0.1:27124/periodic/daily/"
```

Periods: `daily`, `weekly`, `monthly`, `quarterly`, `yearly`

### Search

```bash
# Simple text search
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/search/simple/?query=search+term&contextLength=100"

# JsonLogic search
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: application/vnd.olrapi.jsonlogic+json" \
  -d '{"in": ["project", {"var": "tags"}]}' \
  "https://127.0.0.1:27124/search/"

# Dataview query
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: application/vnd.olrapi.dataview.dql+txt" \
  -d 'TABLE file.mtime FROM "Projects" SORT file.mtime DESC LIMIT 10' \
  "https://127.0.0.1:27124/search/"
```

### Commands

```bash
# List commands
curl -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/commands/"

# Execute command
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/commands/daily-notes:goto-today/"
```

### Open in Obsidian

```bash
curl -k -X POST -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  "https://127.0.0.1:27124/open/path/to/note.md"
```
