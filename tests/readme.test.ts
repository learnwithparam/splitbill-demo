import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const server = readFileSync(join(root, "src/server.ts"), "utf8");
const cli = readFileSync(join(root, "src/cli.ts"), "utf8");

function runItSection(): string {
  const start = readme.indexOf("\n## Run it\n");
  if (start === -1) return "";
  const rest = readme.slice(start + 1);
  const next = rest.indexOf("\n## ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("README Run it", () => {
  test("Run it section lists install, dev and URL", () => {
    const section = runItSection();
    expect(section).not.toBe("");
    expect(section).toContain("bun install");
    expect(section).toContain("bun run dev");
    expect(section).toContain("http://localhost:3200");
  });

  test("Run it section has a CLI example", () => {
    expect(runItSection()).toContain("bun run src/cli.ts groups");
    expect(readme).toContain("balances <group>");
    expect(readme).toContain("export <group>");
    expect(cli).toContain("splitbill balances <group-id>");
    expect(cli).toContain("splitbill export <group-id>");
  });

  test("Run it commands match package.json and server default port", () => {
    expect(pkg.scripts.dev).toBe("bun run src/server.ts");
    expect(server).toContain("process.env.PORT ?? 3200");
  });
});
