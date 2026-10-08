import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

function runItSection(): string {
  const start = readme.indexOf("## Run it");
  if (start === -1) return "";
  const next = readme.indexOf("\n## ", start + 1);
  return next === -1 ? readme.slice(start) : readme.slice(start, next);
}

describe("README Run it section", () => {
  test("Run it section lists bun install", () => {
    expect(runItSection()).toContain("bun install");
  });

  test("dev command and URL match package.json and server default port", () => {
    const section = runItSection();
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");

    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.scripts.dev).toBeDefined();
    const server = readFileSync(join(root, "src/server.ts"), "utf8");
    expect(server).toContain("process.env.PORT ?? 3200");
  });

  test("CLI example runs and lists demo groups", () => {
    const section = runItSection();
    expect(section).toContain("bun run src/cli.ts groups");

    const dir = mkdtempSync(join(tmpdir(), "splitbill-readme-"));
    try {
      const proc = Bun.spawnSync(["bun", "run", "src/cli.ts", "groups"], {
        cwd: root,
        env: { ...process.env, SPLITBILL_DB: join(dir, "test.sqlite") },
      });
      expect(proc.exitCode).toBe(0);
      const output = proc.stdout.toString();
      expect(output).toContain("goa-trip");
      expect(output).toContain("flat-4b");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
