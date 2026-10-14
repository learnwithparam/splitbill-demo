#!/usr/bin/env bash
# PreToolUse on Bash. Agents have wiped databases and history with one command; this one
# refuses those commands and tells Claude to hand them to a human. Exit 2 blocks the call.
cmd=$(jq -r '.tool_input.command // ""')
for pattern in 'rm -[a-z]*r' 'rm .*\.sqlite' 'git reset --hard' 'git clean -[a-z]*f' 'git push .*(-f|--force)' 'drop table'; do
  if grep -Eqi -- "$pattern" <<<"$cmd"; then
    echo "Blocked: '$cmd' destroys work or data. Do not retry it; ask a human to run it." >&2
    exit 2
  fi
done
exit 0
