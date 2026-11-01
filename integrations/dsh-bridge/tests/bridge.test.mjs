import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { mkdtemp, realpath } from "node:fs/promises";
import os from "node:os";
import { buildDelegatedPrompt, assertAllowedRealPath, isAllowedPath, parseJsonEvents, parseRoots } from "../server.mjs";

test("workspace allowlist accepts only a root and descendants", () => {
  const root = path.resolve("D:/work/repo");
  assert.equal(isAllowedPath(root, [root]), true);
  assert.equal(isAllowedPath(path.join(root, "src"), [root]), true);
  assert.equal(isAllowedPath(path.resolve("D:/work/repository"), [root]), false);
});

test("root parsing uses the platform delimiter", () => {
  const raw = ["D:/one", "D:/two"].join(path.delimiter);
  assert.deepEqual(parseRoots(raw), [path.resolve("D:/one"), path.resolve("D:/two")]);
});

test("JSON parser ignores launcher prelude", () => {
  const events = parseJsonEvents('Active code page: 65001\n{"type":"session","sessionId":"session-12345678"}\n{"type":"final","text":"ok"}\n');
  assert.equal(events.length, 2);
  assert.equal(events[1].text, "ok");
});

test("delegated prompt includes policy and task", async () => {
  const prompt = await buildDelegatedPrompt("Create a smoke-test file.", "D:/work/repo");
  assert.match(prompt, /DSH worker contract/);
  assert.match(prompt, /Create a smoke-test file/);
  assert.match(prompt, /ssh autodl/);
  assert.match(prompt, /Remote scope: none/);
});

test("real-path allowlist ignores a stale root when another root is valid", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dsh-bridge-"));
  assert.equal(await assertAllowedRealPath(root, [path.join(root, "missing"), root]), await realpath(root));
});
