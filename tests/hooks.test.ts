import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Each hook reads the event as JSON on stdin; exit 2 is the block and stderr is the reason.
function hook(name: string, event: object, env: Record<string, string> = {}) {
  const run = Bun.spawnSync([`.claude/hooks/${name}`], { stdin: Buffer.from(JSON.stringify(event)), env: { ...process.env, ...env } });
  return { code: run.exitCode, reason: run.stderr.toString() };
}

describe("block-destructive.sh", () => {
  test.each(["rm -rf src", "rm splitbill.sqlite", "git reset --hard HEAD~3", "git clean -fd", "git push origin main --force", "sqlite3 x 'DROP TABLE expenses'"])("blocks %s", (command) => {
    const r = hook("block-destructive.sh", { tool_input: { command } });
    expect(r.code).toBe(2);
    expect(r.reason).toContain("ask a human");
  });
  test.each(["bun test", "git status", "rm notes.txt", "git push origin factory/issue-1"])("lets %s run", (command) => {
    expect(hook("block-destructive.sh", { tool_input: { command } }).code).toBe(0);
  });
});

describe("block-secrets.sh", () => {
  test("drops a prompt that holds a key", () => {
    const r = hook("block-secrets.sh", { prompt: "use sk_live_51Hx9QfakefakefakeAbCd for payments" });
    expect(r.code).toBe(2);
    expect(r.reason).toContain("Put the key in .env");
  });
  test("sends a prompt that names a key without holding it", () => {
    expect(hook("block-secrets.sh", { prompt: "read STRIPE_KEY from .env" }).code).toBe(0);
  });
});

describe("stop-until-green.sh", () => {
  // A fake bun on PATH stands in for the suite, so this test never runs the suite inside itself.
  function fakeBun(exit: number) {
    const dir = mkdtempSync(join(tmpdir(), "fake-bun-"));
    writeFileSync(join(dir, "bun"), `#!/bin/sh\necho "(fail) csv > prints dollars"\nexit ${exit}\n`);
    chmodSync(join(dir, "bun"), 0o755);
    return { PATH: `${dir}:${process.env.PATH}`, TMPDIR: dir };
  }
  test("lets Claude stop on green", () => {
    expect(hook("stop-until-green.sh", { session_id: "s" }, fakeBun(0)).code).toBe(0);
  });
  test("sends Claude back on red with the failing test, three times, then hands over", () => {
    const env = fakeBun(1);
    for (let i = 0; i < 3; i++) {
      const r = hook("stop-until-green.sh", { session_id: "s" }, env);
      expect(r.code).toBe(2);
      expect(r.reason).toContain("csv > prints dollars");
    }
    expect(hook("stop-until-green.sh", { session_id: "s" }, env).reason).toContain("A human takes over");
  });
  test("leaves a factory stage to the factory's gates", () => {
    expect(hook("stop-until-green.sh", { session_id: "s" }, { ...fakeBun(1), FACTORY_STAGE: "build" }).code).toBe(0);
  });
});
