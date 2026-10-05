import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { run } from "../src/cli.ts";

async function readText(path: string): Promise<string> {
  return Bun.file(new URL(path, import.meta.url)).text();
}

async function runItSection(): Promise<string> {
  const readme = await readText("../README.md");
  const start = readme.indexOf("## Run it");
  expect(start).toBeGreaterThanOrEqual(0);
  const next = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, next === -1 ? undefined : next);
}

describe("README Run it section", () => {
  test("README Run it section lists bun install", async () => {
    const section = await runItSection();
    expect(section).toContain("bun install");
  });

  test("README dev command and URL match package.json and server port", async () => {
    const section = await runItSection();
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");

    const pkg = JSON.parse(await readText("../package.json"));
    expect(pkg.scripts.dev).toBe("bun run src/server.ts");

    const server = await readText("../src/server.ts");
    expect(server).toContain("process.env.PORT ?? 3200");
  });

  test("README CLI example runs the groups command", async () => {
    const section = await runItSection();
    expect(section).toContain("bun run src/cli.ts groups");

    const db = new Database(":memory:");
    initSchema(db);
    seedDemoData(db);
    const output = run(["groups"], db);
    expect(output).toContain("goa-trip");
    expect(output).not.toBe("(no groups)");
  });
});
