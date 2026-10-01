# Factory sessions: seeded issues and releases

Material for the sessions other than Lightning-2, using this repo's seeded issues. Lightning-2 is in
[DEMO.md](../DEMO.md). Issue numbers change on every reset, so this page names issues by title. Commands run
from `../factory` unless a step says otherwise.

## Checkpoints

Each session in `teach/sessions.json` (in the `factory` repo) names an immutable `checkpoint/<id>` tag
here, the exact starting state its demo steps and seeded issues run against, kept stable even as `main`
moves on. A participant preparing for one session checks it out instead of `main`:

```bash
git fetch --tags
git checkout checkpoint/lightning-3     # or module-1, module-2, ...
```

## Live sequence

| Step | Issue (by title) | Human action, and where | What you see |
|---|---|---|---|
| 1 | "Splitting $10.00 three ways loses a cent", "CSV export shows raw cents" | add label `factory:ready` on the issue | low risk plans auto-approve, build, and a PR opens, marked ready for review |
| 2 | "README has no run steps" | on its PR, comment `/factory revise <what to change>` | the PR goes back to draft, gets a new commit, and is marked ready again; no second PR |
| 3 | "Expense search leaks other groups' expenses" | comment `/factory revise <text>` on the issue at `awaiting-approval`, then `/factory approve` | plan revision 2, then build |
| 4 | "Upgrade hono 3.12.12 to 4.x" | high risk plan: comment `/factory cancel` | issue closed, worktree removed |
| 5 | "Any group member can delete any other member's expense" | none: it needs a protected path | refused at triage, nothing built |
| 6 | "Make settling up easier" | the agent asks a question: answer in the dashboard, or as a plain issue comment | resumes at the stage that asked |
| 7 | none | `bin/factory scan --repo-dir ../splitbill-demo` | files the nanoid advisory as an issue |

## Paths you cannot force live

Timeouts, verify rejects, red gates, boundary hits, denied tools, a lost claim and crash recovery are
replayed offline, one named test each:

```bash
cd ../factory && bun test tests/scenarios.test.ts
```

A structural test in that file fails if any state label has no scenario, so a new state cannot ship
untested.

## By release

Each section names one thing to show for that factory release. Run them from `../factory`.

### v2.3: the boundary tells the truth

Label "README has no run steps" `factory:ready`, then comment `/factory cancel` while it waits for plan approval.
The issue closes, the PR (if any) closes, and the worktree is gone. Then `bin/factory doctor --repo-dir ../splitbill-demo --json`
shows every check and exits 4 if one fails.

### v2.4: the cockpit

`bin/factory inbox --repo-dir ../splitbill-demo` lists what waits on you. Acting from the dashboard Inbox or with
`bin/factory inbox 12 approve` posts the same `/factory approve` comment you would type. `bin/factory logs 12 --follow`
tails the run.

### v2.5: any agent, counted honestly

Run the cent-split issue and open Analytics: each stage shows its agent, tokens and cost. A stage whose agent reports no
usage shows "Not reported", never $0.00. Read-only stages (triage, plan, verify) cannot write files.

### v2.6: one factory, any agent

Open the Agents page: each preset, its pinned version, the installed version and its doctor rows. Add a second agent under
`agents` in `.factory/config.json` and point `stages.verify` at it. `bin/factory install --update` (or `install.sh --agents`)
links the skills into that agent's own directory.

### v2.6.1: presets that work on first use

`bin/factory verify-agent <name> --repo-dir ../splitbill-demo --issue <N>` runs one issue on that agent and records a fixture.
Only Claude is verified by the maintainers; the rest say "Verified by participants: not yet" until someone does.

### v2.6.2: any repo, safely

State lives under `~/.factory/<owner>/<repo>/`, so splitbill-demo and lwp-website (or any repo you point
`--repo-dir` at) share one binary without colliding. `bin/factory doctor --repo-dir <dir>` is safe to run on a
repo, like lwp-website, that has never opted into `reset`.

### v2.7.0: one machine, priced and capped

`.factory/config.json`'s `routes` can send `bug`/`feature`/`docs`/`security`/`dependency` issues to different
agents per stage; `FACTORY_SLOTS` and `spend.perIssueUsd`/`dailyUsd` are shared across every repo one machine
watches, not per repo. A plan can set `"proof": "check"` to prove non-test work (a docs page, a blog post) by
naming commands instead of writing a failing test first.

### v2.8.0: merge-policy, off until you turn it on

`.factory/config.json`'s `merge.policy` is `"off"` by default, `"dry-run"` posts an audit comment without
merging, `"auto"` merges once every gate holds and the diff fits `merge.autoPaths`/`maxFiles`/`maxLines`.
splitbill-demo and lwp-website both stay on the default; nothing here merges on its own.

### v2.9.0: the review inbox

`bin/factory inbox --repo-dir <dir>` lists what's waiting on you across every repo the factory watches, not
just one. The dashboard's review panel shows a PR's diff, CI status, gate evidence and verify verdict without
opening GitHub, with an "Approve and merge" button for the operator's own authority.

### v2.10.0: memory across runs

Every finished issue gets a read-only retro after its outcome, proposing at most one lesson for
`.factory/memory/lessons.md` (capped at 8 KiB, injected into every stage's context) or one skill edit.
`bin/factory learn --repo-dir <dir>` batches whatever's pending into its own PR; it never merges itself.

### v2.11.0: the holdout guarantee

`.factory/config.json`'s `holdout: { paths, cmd }` names a test suite no stage's agent ever sees:
`Git.excludeFromSparseCheckout` hides the paths from the worktree the moment it's created, and only the verify
stage runs `cmd`, against a scratch copy with those paths force-restored from `origin/main`. splitbill-demo's
first holdout test, `.factory/holdout/settle-up.holdout.test.ts`, checks that `settleUp()`'s transfers zero out
every member's balance. Run it directly with:

```bash
bun test ./.factory/holdout/settle-up.holdout.test.ts
```

A build that plants a regression in `src/balances.ts` (for example, dropping `Math.min(creditor.amount,
debtor.amount)` to just `creditor.amount`) can still pass its own `gates.sh` if nothing else exercises that
path; the holdout test catches it directly (confirmed in a throwaway worktree: the holdout runner reported a
non-zero exit with the exact failing assertion). In a real run that failure feeds the existing reject-and-
rebuild loop and escalates to `factory:needs-human` after `MAX_VERIFY_REJECTS`, the same as an AI-verifier
reject.

A second holdout, `.factory/holdout/csv-export.holdout.test.ts`, targets issue #11 (CSV export leaking raw
cents instead of a zero-padded decimal). Running `factory run --issue 11` live produced a real, unplanned
`factory:needs-human` outcome, but not through the reject-rebuild path above: the verdict was `uncertain`,
not `reject`. AC-1 to AC-3 (the build's own tests, including the exact zero-pad case the holdout also checks)
all passed, and `factory-verify`'s revert-and-reprove step confirmed the fix - reverting `src/csv.ts` to base
made the new tests fail with the raw-cents values, restoring it made them pass again. What tripped `uncertain`
was AC-4, the gate line itself: `gate.json`'s recorded tree (`af942b4`) no longer matched `HEAD^{tree}`
(`328d1d0`) by the time verify ran, because the branch had picked up the second holdout file being merged to
`main` in between - a tree difference limited to `.factory/holdout/**`, nothing in `src/` or `tests/`. Per
`factory-verify/SKILL.md`'s own rule ("if the tree differs... the evidence is stale: report uncertain"), the
verifier declined to trust the stale `gate.json` line, could not re-run `.factory/gates.sh` itself (the
sandbox blocks execution under `.factory/**`), and instead reproduced each gate command by hand (typecheck,
`bun test`, skills validation) - which matched, but on a rebuilt tree it can't certify as the one `gates.sh`
graded. It escalated rather than guess. This is the harness working as designed: a correct fix still goes to
a human when the evidence backing it goes stale, which is a real edge of the same "when the factory stops"
guarantee the reject-rebuild loop gives you, not a failure of it.

The baseline's `holdout.cmd` runs only the settle-up suite. `csv-export.holdout.test.ts` stays in
`holdout.paths`, so agents never see it, but it is not run: at baseline the seeded CSV defect makes it fail,
and verify fails on any holdout failure, which would reject every unrelated issue. Add it back to `cmd` in the
same PR that fixes issue #11.

### v2.12.0: watch and take over

`factory watch --tmux` gives each running issue its own tmux window, `factory attach <N>` jumps to it, and
`factory takeover <N>` hands the stage's Claude session to you; `/exit` hands it back with `/factory retry`.
The PR body gains a "Factory run" table (stage, agent, duration, tool calls, cost, outcome), and
`factory doctor` reports skill drift. [DEMO.md](../DEMO.md) shows all of it on a real run.
