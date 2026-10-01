import { describe, expect, test } from "bun:test";

const root = new URL("../", import.meta.url);

async function readText(path: string): Promise<string> {
  return Bun.file(new URL(path, root)).text();
}

// The text between "## Run it" and the next "## " heading, so a match
// elsewhere in the README doesn't count.
async function runItSection(): Promise<string> {
  const readme = await readText("README.md");
  const start = readme.search(/^## Run it\s*$/m);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = readme.slice(start + "## Run it".length);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("README Run it section", () => {
  test("Run it section lists bun install", async () => {
    expect(await runItSection()).toContain("bun install");
  });

  test("Run it section lists bun run dev and the port it serves", async () => {
    const section = await runItSection();
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");

    const pkg = JSON.parse(await readText("package.json"));
    expect(pkg.scripts.dev).toContain("src/server.ts");
    const server = await readText("src/server.ts");
    expect(server).toMatch(/PORT\s*\?\?\s*3200\b/);
  });

  test("Run it section has a working CLI example", async () => {
    expect(await runItSection()).toContain("bun run src/cli.ts groups");

    // Run the documented command as a fresh process against an empty
    // in-memory DB, so it covers the CLI's own seeding on a clean clone
    // without touching the on-disk splitbill.sqlite.
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "groups"], {
      cwd: root.pathname,
      env: { ...process.env, SPLITBILL_DB: ":memory:" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(output).not.toContain("(no groups)");
    expect(output).not.toContain("Usage:");
    expect(output).toContain("goa-trip");
  });
});
