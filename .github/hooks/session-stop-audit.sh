#!/usr/bin/env bash
# session-stop-audit.sh — Stop hook
#
# Diffs current repo state against the session-start snapshot.
# Tracks: files the agent added/modified, commits made, new migrations, session duration.
# Output: .agent-audit/<sessionId>/session-stop.json

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // "unknown"')

AUDIT_DIR=".agent-audit/${SESSION_ID}"
START="$AUDIT_DIR/session-start.json"

if [[ ! -f "$START" ]]; then
  echo "audit: no start snapshot for $SESSION_ID — skipping" >&2
  exit 0
fi

START_COMMIT=$(jq -r '.commit'    "$START")
START_TIME=$(jq -r   '.timestamp' "$START")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Safely converts a newline-separated list to a JSON array (returns [] for empty input)
to_json_array() {
  local lines="$1"
  if [[ -z "$lines" ]]; then echo '[]'; return; fi
  echo "$lines" | grep -v '^$' | jq -R . | jq -sc 'if length == 0 then [] else . end'
}

# Pre-session dirty baseline — files already dirty before the agent started
PRE_DIRTY=$(jq -r '.dirty_files[]?' "$START" 2>/dev/null | sort | grep -v '^$' || true)

# Committed changes since session start (with A/M/D status)
COMMITTED_STATUS=$(git diff --name-status "$START_COMMIT" HEAD 2>/dev/null || true)
COMMITTED_ADDED=$(echo  "$COMMITTED_STATUS" | awk '$1=="A"{print $2}' | sort | grep -v '^$' || true)

# Currently untracked (new files not yet committed) and currently modified
UNTRACKED_NOW=$(git ls-files --others --exclude-standard 2>/dev/null | sort | grep -v '^$' || true)
CURRENTLY_DIRTY=$(git status --short 2>/dev/null | awk '{print $2}' | sort | grep -v '^$' || true)

# Agent-touched = union of all changes minus the pre-session dirty baseline
AGENT_ALL=$(
  { echo "$COMMITTED_STATUS" | awk '{print $2}'
    echo "$UNTRACKED_NOW"
    echo "$CURRENTLY_DIRTY"
  } | sort -u | grep -v '^$' \
    | comm -23 - <(echo "$PRE_DIRTY" | grep -v '^$' || true) || true
)

# Split into added (new files) vs modified (existing files changed)
AGENT_ADDED=$(
  { echo "$COMMITTED_ADDED"; echo "$UNTRACKED_NOW"; } \
  | sort -u | grep -v '^$' \
  | comm -23 - <(echo "$PRE_DIRTY" | grep -v '^$' || true) || true
)
AGENT_MODIFIED=$(
  comm -23 \
    <(echo "$AGENT_ALL"   | grep -v '^$' || true) \
    <(echo "$AGENT_ADDED" | sort | grep -v '^$' || true) || true
)

AGENT_ALL_JSON=$(to_json_array "$AGENT_ALL")
AGENT_ADDED_JSON=$(to_json_array "$AGENT_ADDED")
AGENT_MODIFIED_JSON=$(to_json_array "$AGENT_MODIFIED")
AGENT_COUNT=$(echo "$AGENT_ALL_JSON" | jq 'length')

# Commits made during this session (hash + subject, newest first)
NEW_COMMITS_RAW=$(git log --oneline "${START_COMMIT}..HEAD" --pretty='%H %s' 2>/dev/null || true)
NEW_COMMITS_JSON=$(to_json_array "$(echo "$NEW_COMMITS_RAW" | awk 'NF' | while IFS=' ' read -r hash rest; do
  printf '{"hash":"%s","message":%s}' "$hash" "$(echo "$rest" | jq -R .)"
done)")
NEW_COMMIT_COUNT=$(echo "$NEW_COMMITS_JSON" | jq 'length')

# New migration files added since session start
START_MIGRATIONS=$(jq -c '.migrations.files' "$START" 2>/dev/null || echo '[]')
CURRENT_MIGRATIONS=$(ls api/database/migrations/*.sql 2>/dev/null | xargs -I{} basename {} | jq -R . | jq -sc . || echo '[]')
NEW_MIGRATIONS=$(jq -n --argjson cur "$CURRENT_MIGRATIONS" --argjson start "$START_MIGRATIONS" '$cur - $start')
NEW_MIGRATION_COUNT=$(echo "$NEW_MIGRATIONS" | jq 'length')

# Session duration in seconds
DURATION=$(python3 -c "
from datetime import datetime, timezone
def parse(s): return datetime.fromisoformat(s.replace('Z','+00:00'))
try:
    print(int((parse('$TIMESTAMP') - parse('$START_TIME')).total_seconds()))
except: print(0)
" 2>/dev/null || echo 0)

jq -n \
  --arg session_id          "$SESSION_ID" \
  --arg started_at          "$START_TIME" \
  --arg stopped_at          "$TIMESTAMP" \
  --argjson duration_sec    "$DURATION" \
  --arg branch              "$BRANCH" \
  --arg start_commit        "$START_COMMIT" \
  --arg stop_commit         "$CURRENT_COMMIT" \
  --argjson all_files       "$AGENT_ALL_JSON" \
  --argjson agent_count     "$AGENT_COUNT" \
  --argjson added_files     "$AGENT_ADDED_JSON" \
  --argjson modified_files  "$AGENT_MODIFIED_JSON" \
  --argjson commits         "$NEW_COMMITS_JSON" \
  --argjson commit_count    "$NEW_COMMIT_COUNT" \
  --argjson new_migrations  "$NEW_MIGRATIONS" \
  --argjson migration_count "$NEW_MIGRATION_COUNT" \
  '{ session_id: $session_id, started_at: $started_at, stopped_at: $stopped_at,
     duration_seconds: $duration_sec,
     branch: $branch, start_commit: $start_commit, stop_commit: $stop_commit,
     agent_touched_files: {
       count: $agent_count,
       added: $added_files,
       modified: $modified_files,
       all: $all_files
     },
     commits: { count: $commit_count, log: $commits },
     new_migrations: { count: $migration_count, files: $new_migrations } }' \
  > "$AUDIT_DIR/session-stop.json"

echo "audit: session stopped — ${AGENT_COUNT} file(s) touched (agent), ${NEW_COMMIT_COUNT} commit(s), ${DURATION}s → $AUDIT_DIR/session-stop.json" >&2
exit 0
