import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { run } from "../src/cli.ts";
import { createApp } from "../src/server.ts";
import pkg from "../package.json";

const root = new URL("../", import.meta.url);

async function runItSection(): Promise<string> {
  const readme = await Bun.file(new URL("README.md", root)).text();
  const start = readme.indexOf("\n## Run it\n");
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = readme.slice(start + 1);
  const next = rest.indexOf("\n## ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

// The output a README shows for `$ <command>`: the lines after it in the
// same fenced block, up to the next `$ ` line or the closing fence.
function exampleOutput(section: string, command: string): string[] {
  const lines = section.split("\n");
  const at = lines.findIndex((l) => l.trim() === `$ ${command}`);
  expect(at).toBeGreaterThanOrEqual(0);
  const out: string[] = [];
  for (const line of lines.slice(at + 1)) {
    if (line.startsWith("$ ") || line.startsWith("```")) break;
    out.push(line);
  }
  return out;
}

// Compare column text, not the exact whitespace between columns.
const columns = (lines: string[]) => lines.map((l) => l.trim().split(/\s+/).join(" "));

describe("README Run it section", () => {
  test("Run it section lists bun install", async () => {
    expect(await runItSection()).toContain("bun install");
  });

  test("Run it section lists bun run dev and its URL", async () => {
    const section = await runItSection();
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");
    expect(pkg.scripts.dev).toBeDefined();
    const server = await Bun.file(new URL("src/server.ts", root)).text();
    expect(server).toContain("process.env.PORT ?? 3200");
  });

  test("Run it CLI example matches real output", async () => {
    const section = await runItSection();
    const db = new Database(":memory:");
    initSchema(db);
    seedDemoData(db);
    const shown = exampleOutput(section, "bun run src/cli.ts groups");
    expect(columns(shown)).toEqual(columns(run(["groups"], db).split("\n")));
  });

  test("Run it curl example matches real GET /api/groups output", async () => {
    const section = await runItSection();
    const db = new Database(":memory:");
    initSchema(db);
    seedDemoData(db);
    const shown = exampleOutput(section, "curl http://localhost:3200/api/groups");
    const res = await createApp(db).request("/api/groups");
    expect(res.status).toBe(200);
    expect(JSON.parse(shown.join("\n"))).toEqual(await res.json());
  });
});
