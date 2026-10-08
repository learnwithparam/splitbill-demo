import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

function runItSection(): string {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const start = readme.indexOf("## Run it");
  expect(start).toBeGreaterThanOrEqual(0);
  const next = readme.indexOf("\n## ", start + 1);
  return next === -1 ? readme.slice(start) : readme.slice(start, next);
}

describe("README Run it section", () => {
  test("Run it section lists bun install", () => {
    expect(runItSection()).toContain("bun install");
  });

  test("Run it section lists bun run dev and http://localhost:3200", () => {
    const section = runItSection();
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");
  });

  test("Run it section has a CLI example", () => {
    expect(runItSection()).toContain("bun run src/cli.ts groups");
  });

  test("README CLI example runs", () => {
    const proc = Bun.spawnSync(["bun", "run", "src/cli.ts", "groups"], {
      cwd: root,
      env: { ...process.env, SPLITBILL_DB: ":memory:" },
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toContain("goa-trip");
  });
});
