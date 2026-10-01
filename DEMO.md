# Lightning-2: Build Your First Software Factory Execution Harness

A real run of the session on factory runner v2.12.3, recorded on 2026-10-01, step by step. Follow it to run
the same demo yourself. Each link opens the exact issue or PR from this run. `reset` closed them afterwards and
reseeded the tickets under new numbers, so on your run the numbers differ but the titles match. The live run
sheet with timings and talking points is `teach/lightning-2.md` in software-factory.

## Setup

Clone this repo and software-factory side by side, then from `factory/`:

```bash
gh auth status                                   # logged in to github.com
claude --version                                 # Claude Code runs
bin/factory reset --repo-dir ../splitbill-demo --dry-run
bin/factory reset --repo-dir ../splitbill-demo   # seven open issues, no factory:* label
bin/factory doctor --repo-dir ../splitbill-demo  # no [fail] rows
```

The runner polls GitHub every 15 seconds. All human input is GitHub state: a label, an issue or PR comment,
or a dashboard button (which posts the same comment). Only OWNER, MEMBER and COLLABORATOR count. The factory
never merges.

## The run at a glance

| Ticket | Issue | PR | Outcome |
|---|---|---|---|
| README has no run steps or CLI example | [#73](https://github.com/learnwithparam/splitbill-demo/issues/73) | [#80](https://github.com/learnwithparam/splitbill-demo/pull/80) | PR ready, then `/factory revise` added a third commit to the same PR |
| Splitting $10.00 three ways loses a cent | [#74](https://github.com/learnwithparam/splitbill-demo/issues/74) | [#81](https://github.com/learnwithparam/splitbill-demo/pull/81) | money is high risk at triage, so a human approved the plan; merged as the deliver step |
| CSV export shows raw cents | [#75](https://github.com/learnwithparam/splitbill-demo/issues/75) | [#82](https://github.com/learnwithparam/splitbill-demo/pull/82) | verify pass on the first try |
| Expense search leaks other groups' expenses | [#76](https://github.com/learnwithparam/splitbill-demo/issues/76) | [#83](https://github.com/learnwithparam/splitbill-demo/pull/83) | operator takeover mid-build, handback, verify pass after an operator check |
| Any group member can delete any other member's expense | [#77](https://github.com/learnwithparam/splitbill-demo/issues/77) | none | refused at triage: protected path |
| Upgrade hono 3.12.12 to 4.x | [#78](https://github.com/learnwithparam/splitbill-demo/issues/78) | none | high-risk plan, cancelled |

## Step 0: start clean

After Setup, from `factory/`:

```bash
make demo                                 # tmux layout: watch + dashboard on :4100
```

In `splitbill-demo/`, run `git switch -c my-feature` and leave one unstaged edit in `README.md`.

## Step 1: a worktree for every task

Label [#73](https://github.com/learnwithparam/splitbill-demo/issues/73) and
[#74](https://github.com/learnwithparam/splitbill-demo/issues/74) `factory:ready`. Both are claimed within one
poll, each in its own worktree on its own `factory/issue-N` branch, beside your `my-feature` checkout:

![Two worktrees beside my-feature](docs/demo/lightning-2/01-two-worktrees.png)
![The line with both issues mid-flight](docs/demo/lightning-2/04-line-midflight.png)

Then label [#78](https://github.com/learnwithparam/splitbill-demo/issues/78) (hono). Its plan is high risk,
so it stops at `factory:awaiting-approval`. Comment `/factory cancel`: the issue closes, its worktree is
removed, and the `factory/issue-78` branch is kept.

![#78 cancelled](docs/demo/lightning-2/06-hono-cancelled.png)

## Step 2: sandbox boundaries

`jq '{protectedPaths, agentCommands, maxBudgetUsd, concurrency, holdout}' .factory/config.json` shows what
bounds an agent:

![Boundaries in config.json](docs/demo/lightning-2/02-boundaries.png)

Label [#77](https://github.com/learnwithparam/splitbill-demo/issues/77). The fix needs
`src/auth/permissions.ts`, a protected path, so triage refuses it. Nothing is planned or built.

![#77 refused at triage](docs/demo/lightning-2/05-idor-refused.png)

Timeouts, verify rejects, denied tools, a lost claim and crash recovery cannot be forced live. Each replays
offline as one named test: `bun test tests/scenarios.test.ts` in `factory/`.

## Step 3: one execution harness

Follow #73 and #74 through plan, build, verify and PR. #74 touches money, so triage rates it high risk and
its plan waits for `bin/factory inbox 74 approve --repo learnwithparam/splitbill-demo`. Anything waiting on
a human collects in the inbox:

![Inbox](docs/demo/lightning-2/03-inbox.png)

[PR #80](https://github.com/learnwithparam/splitbill-demo/pull/80) closes #73 and carries the plan, gate
evidence, verdict and the "Factory run" table. Each verify row shows its verdict:

![PR #80 summary](docs/demo/lightning-2/07-pr-80-summary.png)
![PR #80 run table](docs/demo/lightning-2/08-pr-80-run-table.png)

On PR #80, comment `/factory revise add a curl example for GET /api/groups`. The PR goes back to draft,
build runs again, and the same PR gains a third commit (`189563e`) instead of a second PR:

![PR #80 after the revise](docs/demo/lightning-2/10-pr-80-revise-commit.png)

[PR #81](https://github.com/learnwithparam/splitbill-demo/pull/81) (the cent) and
[PR #82](https://github.com/learnwithparam/splitbill-demo/pull/82) (CSV, verify pass on the first try):

![PR #81 summary](docs/demo/lightning-2/11-pr-81-summary.png)
![PR #82 run table](docs/demo/lightning-2/12-pr-82-run-table.png)

## Step 4: your branch stays isolated

In `splitbill-demo/`:

```bash
git status --short
git branch --show-current
git worktree list
```

You are still on `my-feature` with the one edit, and every factory worktree sits beside your checkout under
`~/.factory/`.

![my-feature untouched](docs/demo/lightning-2/09-my-feature-untouched.png)

## Step 5: watch and take over

Three open factory PRs pause the line (`STOP_IF: 3 factory PRs open in review`), so merge one first: this
run merged PR #81. Then label [#76](https://github.com/learnwithparam/splitbill-demo/issues/76), approve its
plan, and mid-build run:

```bash
bin/factory takeover 76 --repo-dir ../splitbill-demo
```

The build stops and its Claude session resumes in your terminal:

![Takeover resumed](docs/demo/lightning-2/13-takeover-resumed.png)

Steer it ("the quote test also asserts there is no error field"). It finishes green; `/exit` hands back with
`/factory retry`, and the factory resumes at build with the worktree as you left it, then verifies:

![Nudge applied, build green](docs/demo/lightning-2/14-takeover-nudge-done.png)
![Handback](docs/demo/lightning-2/15-takeover-handback.png)

Verify came back `uncertain`: its revert-and-fail check needs a write, and verify is read-only. The operator
ran that check by hand in a scratch worktree (the leak test fails on `main`, passes with the fix), posted the
evidence, and ran `bin/factory inbox 76 retry --repo learnwithparam/splitbill-demo`. The second verify passed:

![#76 operator check, retry, pass](docs/demo/lightning-2/22-issue-76-handback.png)

[PR #83](https://github.com/learnwithparam/splitbill-demo/pull/83)'s run table records the takeover as its
own build row, both verdicts, and the two retries under "Needed help":

![PR #83 run table](docs/demo/lightning-2/21-pr-83-takeover-run-table.png)

## Step 6: the whole run in the dashboard

![Inbox](docs/demo/lightning-2/16-dash-inbox.png)
![Line](docs/demo/lightning-2/17-dash-line.png)
![Runs](docs/demo/lightning-2/18-dash-runs.png)
![Run sheet for #73](docs/demo/lightning-2/19-dash-run-73.png)
![Analytics](docs/demo/lightning-2/20-dash-analytics.png)

Stop the watcher with Ctrl-C in its pane, then deliver and reset (below).

## Replay this run after reset

`reset` wipes the run's database and worktrees. Before it, snapshot them; afterwards, serve the snapshot on
its own port. From `factory/`:

```bash
teach/demo/lightning-2.sh snapshot        # factory.db + .factory/runs/ into ~/.factory/recordings/lightning-2/v<version>/snapshot
teach/demo/lightning-2.sh replay          # dashboard on http://127.0.0.1:4101
```

Line, Runs, run sheets and Analytics come from the snapshot. Inbox and issue threads are live GitHub, and
an Act button posts a real comment. This run's snapshot is 508K and lives on the presenter's machine.

![Replay: the line](docs/demo/lightning-2/23-replay-line.png)
![Replay: run sheet for #76](docs/demo/lightning-2/24-replay-run-76.png)

## If something goes wrong live

| Symptom | Do |
|---|---|
| Verify says `uncertain` on a fix you believe | its revert-and-fail check needs a write and verify is read-only. Run that check yourself (the new test fails on `main`, passes with the fix), comment the evidence, then `bin/factory inbox <N> retry --repo learnwithparam/splitbill-demo` |
| A labelled issue is not claimed | the watcher pane says `STOP_IF: 3 factory PRs open in review`. Merge one PR |
| `takeover` hangs on `git clone` | pass `--repo-dir ../splitbill-demo`, not `--repo` |
| A `/factory` command is ignored | it must start the comment, not sit on a later line |
| An issue parks `factory:needs-human` or `factory:failed` | read the parking comment, then `bin/factory inbox <N> retry --repo learnwithparam/splitbill-demo` |

## Deliver and reset

`main` requires a code-owner approval and the runner posts as you, so merge a factory PR with an admin
bypass, then put `main` back on the `baseline` tag:

```bash
gh pr merge <n> -R learnwithparam/splitbill-demo --squash --admin
bin/factory reset --repo-dir ../splitbill-demo --dry-run   # lists the merge as drop-commit
bin/factory reset --repo-dir ../splitbill-demo
```

`reset` force-pushes `main`, so it needs "Allow force pushes" on for you (Settings, Branches); if it is off,
the reset fails on its first push and changes nothing. Then in `splitbill-demo/`: `git switch main && git
branch -D my-feature`, and `tmux kill-session -t lightning-2`.

Setup changes (config, skills, CI) are not demo output: merge them, then
`bin/factory rebaseline --repo-dir ../splitbill-demo` moves the `baseline` tag so `reset` keeps them.
