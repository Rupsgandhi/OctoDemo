#!/usr/bin/env bash
# session-start-audit.sh — SessionStart hook
#
# Captures a baseline snapshot when an agent session opens.
# Tracks: branch, commit, commit message, pre-existing dirty files, migration baseline.
# Output: .agent-audit/<sessionId>/session-start.json

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // "unknown"')

AUDIT_DIR=".agent-audit/${SESSION_ID}"
mkdir -p "$AUDIT_DIR"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
COMMIT_MSG=$(git log -1 --pretty=%s 2>/dev/null || echo "unknown")
DIRTY=$(git status --short 2>/dev/null | awk '{print $2}' | jq -R . | jq -sc .)

MIGRATION_FILES=$(ls api/database/migrations/*.sql 2>/dev/null | xargs -I{} basename {} | jq -R . | jq -sc . || echo '[]')
MIGRATION_COUNT=$(echo "$MIGRATION_FILES" | jq 'length')

jq -n \
  --arg session_id        "$SESSION_ID" \
  --arg timestamp         "$TIMESTAMP" \
  --arg branch            "$BRANCH" \
  --arg commit            "$COMMIT" \
  --arg commit_message    "$COMMIT_MSG" \
  --argjson dirty         "$DIRTY" \
  --argjson migration_files  "$MIGRATION_FILES" \
  --argjson migration_count  "$MIGRATION_COUNT" \
  '{ session_id: $session_id, timestamp: $timestamp, branch: $branch,
     commit: $commit, commit_message: $commit_message,
     dirty_files: $dirty,
     migrations: { count: $migration_count, files: $migration_files } }' \
  > "$AUDIT_DIR/session-start.json"

echo "audit: session started → $AUDIT_DIR/session-start.json" >&2
exit 0
