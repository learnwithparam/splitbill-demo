---
name: fix-issue
description: Fix one GitHub issue end to end without a human in the loop. Use when the prompt holds an issue's title and body and asks for a fix. Writes a failing test first, fixes the code, runs the tests and has the code-reviewer subagent check the diff.
---

# Fix an issue

The issue's title and body are in the prompt. You run headless: nobody answers questions, so decide and say why.

0. Run `bun install`: a new worktree has no packages yet.
1. Read the issue and find the code it is about. State the bug in one sentence.
2. Write a test that fails because of the bug. Run `bun test` and see it fail.
3. Fix the code, not the test. Change as little as you can.
4. Run `bun test` until every test passes.
5. Commit the test and the fix together: `git add -A && git commit -m "Fix #<issue>: <what changed>"`.
6. Ask the `code-reviewer` subagent to review `git diff main...HEAD`. Fix what it calls a bug, then commit again.

You cannot push or open the pull request, and that is on purpose: the script that started you runs the tests itself and opens it only when they pass.

Your last message becomes the pull request description. Write it as:

```
## What was wrong
<one or two sentences>

## The fix
<the files changed, and why>

## The test
<the test that failed before the fix and passes now>

## Review
<the code-reviewer's verdict and any note it raised>
```
