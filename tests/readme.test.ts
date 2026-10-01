import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

/** The body of the `## Run it` section, up to the next `## ` heading. */
function runItSection(): string {
  const match = readme.match(/^## Run it\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  return match?.[1] ?? "";
}

describe("README Run it section", () => {
  test("README has a Run it section", () => {
    expect(readme).toMatch(/^## Run it$/m);
  });

  test("Run it lists install and dev commands with the served URL", () => {
    const section = runItSection();
    expect(section).toContain("bun install");
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");
  });

  test("README CLI example runs and lists groups", () => {
    const section = runItSection();
    expect(section).toContain("bun run src/cli.ts groups");

    const proc = Bun.spawnSync(["bun", "run", "src/cli.ts", "groups"], {
      cwd: root,
      env: { ...process.env, SPLITBILL_DB: ":memory:" },
    });
    expect(proc.exitCode).toBe(0);
    const lines = proc.stdout.toString().trim().split("\n");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).not.toBe("(no groups)");
    expect(proc.stdout.toString()).toContain("goa-trip");
  });

  test("Run it commands exist in package.json / src", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const section = runItSection();
    expect(section).not.toBe("");
    for (const [, script] of section.matchAll(/bun run (\w[\w-]*)(?=\s|`|$)/g)) {
      expect(pkg.scripts).toHaveProperty(script!);
    }
    for (const [, file] of section.matchAll(/bun run (src\/[\w/.-]+\.ts)/g)) {
      expect(existsSync(join(root, file!))).toBe(true);
    }
    expect(pkg.scripts).toHaveProperty("dev");
    expect(existsSync(join(root, "src/cli.ts"))).toBe(true);
  });
});
