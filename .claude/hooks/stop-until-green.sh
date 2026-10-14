#!/usr/bin/env bash
# Stop. Claude may not end its turn while a test is red; after three tries a human takes over.
# The factory's stages run their own gates, so this guards a person's session only.
[ -n "${FACTORY_STAGE:-}" ] && exit 0
session=$(jq -r '.session_id // "none"')
tries="${TMPDIR:-/tmp}/stop-until-green-$session"
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if out=$(bun test 2>&1); then rm -f "$tries"; exit 0; fi
n=$(( $(cat "$tries" 2>/dev/null || echo 0) + 1 )); echo "$n" >"$tries"
if [ "$n" -gt 3 ]; then echo "Tests are still red after three tries. A human takes over from here." >&2; exit 0; fi
{ echo "Tests are red, so you are not done. Fix the code, not the test, then stop again:"; grep -E '\(fail\)|error:|Expected|Received' <<<"$out" | head -20; } >&2
exit 2
