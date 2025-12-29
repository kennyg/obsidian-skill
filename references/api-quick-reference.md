# Obsidian Local REST API - Quick Reference

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server status |
| GET | `/vault/` | List root files |
| GET | `/vault/{dir}/` | List directory files |
| GET | `/vault/{path}` | Read file |
| PUT | `/vault/{path}` | Create/update file |
| POST | `/vault/{path}` | Append to file |
| PATCH | `/vault/{path}` | Patch file (heading/block/frontmatter) |
| DELETE | `/vault/{path}` | Delete file |
| GET | `/active/` | Get active file |
| POST | `/active/` | Append to active file |
| PATCH | `/active/` | Patch active file |
| GET | `/periodic/{period}/` | Get current periodic note |
| GET | `/periodic/{period}/{y}/{m}/{d}/` | Get specific date note |
| POST | `/periodic/{period}/` | Append to periodic note |
| POST | `/search/simple/?query=...` | Simple text search |
| POST | `/search/` | JsonLogic or Dataview search |
| GET | `/commands/` | List commands |
| POST | `/commands/{id}/` | Execute command |
| POST | `/open/{path}` | Open file in Obsidian |

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
