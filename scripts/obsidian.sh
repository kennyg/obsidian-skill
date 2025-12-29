#!/bin/bash
# Obsidian CLI wrapper for Local REST API
# Usage: obsidian.sh <command> [args]
#
# Required env vars (set via .envrc):
#   OBSIDIAN_API_KEY     - API key from Local REST API plugin
#   OBSIDIAN_VAULT_PATH  - Path to vault (for filesystem operations)
#
# Optional env vars:
#   OBSIDIAN_HOST        - API host (default: 127.0.0.1)
#   OBSIDIAN_PORT        - API port (default: 27124)
#   OBSIDIAN_HTTPS       - Use HTTPS (default: true)

set -e

# Configuration from environment
OBSIDIAN_HOST="${OBSIDIAN_HOST:-127.0.0.1}"
OBSIDIAN_PORT="${OBSIDIAN_PORT:-27124}"
OBSIDIAN_HTTPS="${OBSIDIAN_HTTPS:-true}"
OBSIDIAN_DAILY_FORMAT="${OBSIDIAN_DAILY_FORMAT:-Journal/%Y-%m-%d.md}"

if [ "$OBSIDIAN_HTTPS" = "true" ]; then
	BASE_URL="https://${OBSIDIAN_HOST}:${OBSIDIAN_PORT}"
	CURL_OPTS="-k" # Allow self-signed certs
else
	BASE_URL="http://${OBSIDIAN_HOST}:${OBSIDIAN_PORT}"
	CURL_OPTS=""
fi

check_api_key() {
	if [ -z "$OBSIDIAN_API_KEY" ]; then
		echo "Error: OBSIDIAN_API_KEY not set"
		echo "Add to your .envrc: export OBSIDIAN_API_KEY=\"your-key\""
		exit 1
	fi
}

check_vault_path() {
	if [ -z "$OBSIDIAN_VAULT_PATH" ]; then
		echo "Error: OBSIDIAN_VAULT_PATH not set"
		echo "Add to your .envrc: export OBSIDIAN_VAULT_PATH=\"/path/to/vault\""
		exit 1
	fi
}

AUTH_HEADER="Authorization: Bearer $OBSIDIAN_API_KEY"

case "$1" in
# === Filesystem Operations ===
fs-read)
	check_vault_path
	if [ -z "$2" ]; then
		echo "Usage: $0 fs-read <path>"
		exit 1
	fi
	cat "$OBSIDIAN_VAULT_PATH/$2"
	;;

fs-write)
	check_vault_path
	if [ -z "$2" ] || [ -z "$3" ]; then
		echo "Usage: $0 fs-write <path> <content>"
		exit 1
	fi
	mkdir -p "$(dirname "$OBSIDIAN_VAULT_PATH/$2")"
	echo "$3" >"$OBSIDIAN_VAULT_PATH/$2"
	echo "Written to $2"
	;;

fs-list)
	check_vault_path
	find "$OBSIDIAN_VAULT_PATH/${2:-}" -name "*.md" -type f 2>/dev/null | sed "s|$OBSIDIAN_VAULT_PATH/||" | head -50
	;;

fs-search)
	check_vault_path
	if [ -z "$2" ]; then
		echo "Usage: $0 fs-search <query>"
		exit 1
	fi
	grep -r -l "$2" "$OBSIDIAN_VAULT_PATH" --include="*.md" 2>/dev/null | sed "s|$OBSIDIAN_VAULT_PATH/||"
	;;

fs-daily-append)
	check_vault_path
	if [ -z "$2" ]; then
		echo "Usage: $0 fs-daily-append <content>"
		exit 1
	fi
	daily_path="$OBSIDIAN_VAULT_PATH/$(date +"$OBSIDIAN_DAILY_FORMAT")"
	mkdir -p "$(dirname "$daily_path")"
	# Ensure file ends with newline before appending
	if [ -f "$daily_path" ] && [ -s "$daily_path" ]; then
		tail -c 1 "$daily_path" | grep -q '^$' || echo "" >>"$daily_path"
	fi
	echo "$2" >>"$daily_path"
	echo "Appended to $(date +"$OBSIDIAN_DAILY_FORMAT")"
	;;

# === REST API Operations ===
status)
	check_api_key
	curl $CURL_OPTS -s -H "$AUTH_HEADER" "$BASE_URL/" | jq .
	;;

list)
	check_api_key
	path="${2:-}"
	if [ -n "$path" ]; then
		curl $CURL_OPTS -s -H "$AUTH_HEADER" "$BASE_URL/vault/${path}/" | jq .
	else
		curl $CURL_OPTS -s -H "$AUTH_HEADER" "$BASE_URL/vault/" | jq .
	fi
	;;

read)
	check_api_key
	if [ -z "$2" ]; then
		echo "Usage: $0 read <path>"
		exit 1
	fi
	curl $CURL_OPTS -s -H "$AUTH_HEADER" "$BASE_URL/vault/$2"
	;;

meta)
	check_api_key
	if [ -z "$2" ]; then
		echo "Usage: $0 meta <path>"
		exit 1
	fi
	curl $CURL_OPTS -s -H "$AUTH_HEADER" \
		-H "Accept: application/vnd.olrapi.note+json" \
		"$BASE_URL/vault/$2" | jq .
	;;

write)
	check_api_key
	if [ -z "$2" ] || [ -z "$3" ]; then
		echo "Usage: $0 write <path> <content>"
		exit 1
	fi
	curl $CURL_OPTS -s -X PUT -H "$AUTH_HEADER" \
		-H "Content-Type: text/markdown" \
		-d "$3" \
		"$BASE_URL/vault/$2"
	echo "Written to $2"
	;;

append)
	check_api_key
	if [ -z "$2" ] || [ -z "$3" ]; then
		echo "Usage: $0 append <path> <content>"
		exit 1
	fi
	curl $CURL_OPTS -s -X POST -H "$AUTH_HEADER" \
		-H "Content-Type: text/markdown" \
		-d "$3" \
		"$BASE_URL/vault/$2"
	echo "Appended to $2"
	;;

delete)
	check_api_key
	if [ -z "$2" ]; then
		echo "Usage: $0 delete <path>"
		exit 1
	fi
	curl $CURL_OPTS -s -X DELETE -H "$AUTH_HEADER" "$BASE_URL/vault/$2"
	echo "Deleted $2"
	;;

search)
	check_api_key
	if [ -z "$2" ]; then
		echo "Usage: $0 search <query>"
		exit 1
	fi
	query=$(printf '%s' "$2" | jq -sRr @uri)
	curl $CURL_OPTS -s -X POST -H "$AUTH_HEADER" \
		"$BASE_URL/search/simple/?query=$query&contextLength=100" | jq .
	;;

daily)
	check_api_key
	curl $CURL_OPTS -s -H "$AUTH_HEADER" "$BASE_URL/periodic/daily/"
	;;

daily-meta)
	check_api_key
	curl $CURL_OPTS -s -H "$AUTH_HEADER" \
		-H "Accept: application/vnd.olrapi.note+json" \
		"$BASE_URL/periodic/daily/" | jq .
	;;

daily-append)
	check_api_key
	if [ -z "$2" ]; then
		echo "Usage: $0 daily-append <content>"
		exit 1
	fi
	curl $CURL_OPTS -s -X POST -H "$AUTH_HEADER" \
		-H "Content-Type: text/markdown" \
		-d "$2" \
		"$BASE_URL/periodic/daily/"
	echo "Appended to daily note"
	;;

active)
	check_api_key
	curl $CURL_OPTS -s -H "$AUTH_HEADER" "$BASE_URL/active/"
	;;

commands)
	check_api_key
	curl $CURL_OPTS -s -H "$AUTH_HEADER" "$BASE_URL/commands/" | jq .
	;;

exec)
	check_api_key
	if [ -z "$2" ]; then
		echo "Usage: $0 exec <command-id>"
		exit 1
	fi
	curl $CURL_OPTS -s -X POST -H "$AUTH_HEADER" "$BASE_URL/commands/$2/"
	echo "Executed: $2"
	;;

open)
	check_api_key
	if [ -z "$2" ]; then
		echo "Usage: $0 open <path>"
		exit 1
	fi
	curl $CURL_OPTS -s -X POST -H "$AUTH_HEADER" "$BASE_URL/open/$2"
	echo "Opened $2 in Obsidian"
	;;

env)
	echo "OBSIDIAN_VAULT_PATH: ${OBSIDIAN_VAULT_PATH:-<not set>}"
	echo "OBSIDIAN_API_KEY:    ${OBSIDIAN_API_KEY:+<set>}${OBSIDIAN_API_KEY:-<not set>}"
	echo "OBSIDIAN_HOST:       ${OBSIDIAN_HOST:-127.0.0.1}"
	echo "OBSIDIAN_PORT:       ${OBSIDIAN_PORT:-27124}"
	echo "OBSIDIAN_HTTPS:      ${OBSIDIAN_HTTPS:-true}"
	;;

*)
	cat <<'EOF'
Obsidian CLI - Local REST API & Filesystem Wrapper

Usage: obsidian.sh <command> [args]

Environment (set via .envrc):
  OBSIDIAN_VAULT_PATH   Path to vault (required for fs-* commands)
  OBSIDIAN_API_KEY      API key (required for REST API commands)
  OBSIDIAN_HOST         API host (default: 127.0.0.1)
  OBSIDIAN_PORT         API port (default: 27124)
  OBSIDIAN_HTTPS        Use HTTPS (default: true)

Filesystem Commands (fast, no API needed):
  fs-read <path>            Read note via filesystem
  fs-write <path> <content> Write note via filesystem
  fs-list [dir]             List .md files
  fs-search <query>         Grep search
  fs-daily-append <content> Append to daily note (offline)

REST API - File Operations:
  list [dir]                List files in vault or directory
  read <path>               Read note content
  meta <path>               Read note with metadata (JSON)
  write <path> <content>    Create/update note
  append <path> <content>   Append to note
  delete <path>             Delete note

REST API - Daily Notes:
  daily                     Get today's daily note
  daily-meta                Get daily note with metadata
  daily-append <content>    Append to daily note

REST API - Search & Commands:
  search <query>            Simple text search
  commands                  List available commands
  exec <command-id>         Execute Obsidian command

Other:
  status                    Check API connection
  active                    Get currently active file
  open <path>               Open file in Obsidian UI
  env                       Show current configuration
EOF
	exit 1
	;;
esac
