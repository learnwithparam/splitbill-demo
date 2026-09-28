import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

async function readText(path: string): Promise<string> {
  return Bun.file(join(root, path)).text();
}

/** The body of the `## Run it` section, up to the next `## ` heading. */
async function runItSection(): Promise<string> {
  const readme = await readText("README.md");
  const match = readme.match(/^## Run it\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  return match?.[1] ?? "";
}

describe("README Run it section", () => {
  test("README has a Run it section with bun install", async () => {
    const section = await runItSection();
    expect(section).not.toBe("");
    expect(section).toContain("bun install");
  });

  test("Run it documents bun run dev on http://localhost:3200, matching package.json and server.ts", async () => {
    const section = await runItSection();
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");

    const pkg = JSON.parse(await readText("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.dev).toBeDefined();

    const server = await readText("src/server.ts");
    expect(server).toContain("process.env.PORT ?? 3200");
  });

  test("Run it CLI example `bun run src/cli.ts groups` runs and lists groups", async () => {
    const section = await runItSection();
    expect(section).toContain("bun run src/cli.ts groups");

    const dir = mkdtempSync(join(tmpdir(), "splitbill-readme-"));
    try {
      const proc = Bun.spawnSync(["bun", "run", "src/cli.ts", "groups"], {
        cwd: root,
        env: { ...process.env, SPLITBILL_DB: join(dir, "readme.sqlite") },
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
