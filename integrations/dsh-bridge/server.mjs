import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const stateDir = path.resolve(process.env.DSH_BRIDGE_STATE_DIR || path.join(here, ".state"));
const registryPath = path.join(stateDir, "sessions.json");
const contractPath = path.join(here, "worker-contract.md");
const maxOutputBytes = 4 * 1024 * 1024;

function canonical(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function parseRoots(value = "") {
  return value.split(path.delimiter).map((item) => item.trim()).filter(Boolean).map((item) => path.resolve(item));
}

export function isAllowedPath(candidate, roots) {
  if (!candidate || roots.length === 0) return false;
  const target = canonical(candidate);
  return roots.some((root) => {
    const base = canonical(root);
    return target === base || target.startsWith(`${base}${path.sep}`);
  });
}

export async function assertAllowedRealPath(candidate, roots) {
  const target = await fs.realpath(candidate);
  const settledRoots = await Promise.allSettled(roots.map(async (root) => fs.realpath(root)));
  const realRoots = settledRoots.filter((item) => item.status === "fulfilled").map((item) => item.value);
  if (realRoots.length === 0) throw new Error("DSH_BRIDGE_ROOTS contains no accessible directories");
  if (!isAllowedPath(target, realRoots)) throw new Error(`cwd resolves outside DSH_BRIDGE_ROOTS: ${candidate}`);
  if (!(await fs.stat(target)).isDirectory()) throw new Error("cwd is not a directory");
  return target;
}

export function parseJsonEvents(stdout) {
  return stdout.split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    if (!value.startsWith("{")) return [];
    try { return [JSON.parse(value)]; } catch { return []; }
  });
}

export async function buildDelegatedPrompt(task, cwd = "unavailable", remoteScope = "none") {
  if (typeof task !== "string" || !task.trim()) throw new Error("task must be a non-empty string");
  if (task.length > 100_000) throw new Error("task exceeds 100000 characters");
  return `${await fs.readFile(contractPath, "utf8")}\n\n---\n\n# Current task\n\nWorkspace: ${cwd}\nRemote scope: ${remoteScope || "none"}\n\n${task.trim()}\n`;
}

async function loadRegistry() {
  try { return JSON.parse(await fs.readFile(registryPath, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return { sessions: [] }; throw error; }
}

async function saveRegistry(registry) {
  await fs.mkdir(stateDir, { recursive: true });
  const temp = `${registryPath}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  await fs.rename(temp, registryPath);
}

let registryQueue = Promise.resolve();

function updateRegistry(mutator) {
  const operation = registryQueue.then(async () => {
    const registry = await loadRegistry();
    await mutator(registry);
    await saveRegistry(registry);
  });
  registryQueue = operation.catch(() => {});
  return operation;
}

function safeSessionId(value) {
  if (!/^session-[A-Za-z0-9-]{8,128}$/.test(value ?? "")) throw new Error("invalid DSH session id");
  return value;
}

const activeChildren = new Map();
const activeWorkspaces = new Set();

function terminateTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    killer.on("error", () => child.kill());
    killer.on("close", (code) => { if (code !== 0) child.kill(); });
    return;
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
  const force = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, 2_000);
  force.unref();
}

function runProcess(command, args, { cwd, env = process.env, input, timeoutMs = 900_000, requestId } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, shell: false, windowsHide: true, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"] });
    if (requestId != null) activeChildren.set(requestId, child);
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    let terminalError = null;
    let forcedFinish = null;
    const append = (current, chunk) => {
      const next = Buffer.concat([current, chunk]);
      if (next.length > maxOutputBytes) { child.kill(); throw new Error(`process output exceeded ${maxOutputBytes} bytes`); }
      return next;
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (forcedFinish) clearTimeout(forcedFinish);
      if (requestId != null) activeChildren.delete(requestId);
      callback(value);
    };
    const abort = (error) => {
      if (settled || terminalError) return;
      terminalError = error;
      terminateTree(child);
      forcedFinish = setTimeout(() => finish(reject, terminalError), 5_000);
      forcedFinish.unref();
    };
    child.stdout.on("data", (chunk) => { try { stdout = append(stdout, chunk); } catch (error) { abort(error); } });
    child.stderr.on("data", (chunk) => { try { stderr = append(stderr, chunk); } catch (error) { abort(error); } });
    child.on("error", (error) => finish(reject, error));
    child.stdin.on("error", abort);
    const timer = setTimeout(() => {
      abort(new Error(`DSH task timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    child.on("close", (code, signal) => {
      if (terminalError) finish(reject, terminalError);
      else finish(resolve, { code, signal, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") });
    });
    child.stdin.end(input ?? "", "utf8");
  });
}

function invocation(mode, sessionId) {
  const dsh = process.env.DSH_CLI_PATH || "dsh";
  if (process.platform !== "win32") {
    const args = mode === "version" ? ["-V"] : ["headless", "--json", ...(sessionId ? ["--session-id", safeSessionId(sessionId)] : []), "-"];
    return { command: dsh, args, env: process.env };
  }
  const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const expression = mode === "version"
    ? "& $env:DSH_BRIDGE_CLI -V"
    : sessionId
      ? "& $env:DSH_BRIDGE_CLI headless --json --session-id $env:DSH_BRIDGE_SESSION -"
      : "& $env:DSH_BRIDGE_CLI headless --json -";
  return {
    command: powershell,
    args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", expression],
    env: { ...process.env, DSH_BRIDGE_CLI: dsh, ...(sessionId ? { DSH_BRIDGE_SESSION: safeSessionId(sessionId) } : {}) },
  };
}

async function runDsh({ task, cwd, remoteScope = "none", timeoutSeconds, sessionId, requestId }) {
  const roots = parseRoots(process.env.DSH_BRIDGE_ROOTS);
  if (!isAllowedPath(cwd, roots)) throw new Error(`cwd is outside DSH_BRIDGE_ROOTS: ${cwd}`);
  const realCwd = await assertAllowedRealPath(cwd, roots);
  const workspaceKey = canonical(realCwd);
  if (activeWorkspaces.has(workspaceKey)) throw new Error("another DSH task already owns this workspace");
  activeWorkspaces.add(workspaceKey);
  const seconds = Math.min(Math.max(Number(timeoutSeconds) || 900, 10), 7200);
  let result;
  try {
    const command = invocation("task", sessionId);
    result = await runProcess(command.command, command.args, {
      cwd: realCwd, env: command.env, input: await buildDelegatedPrompt(task, realCwd, remoteScope), timeoutMs: seconds * 1000, requestId,
    });
  } finally {
    activeWorkspaces.delete(workspaceKey);
  }
  const events = parseJsonEvents(result.stdout);
  const resolvedSession = events.find((event) => event.type === "session")?.sessionId || sessionId || null;
  const finalEvent = [...events].reverse().find((event) => event.type === "final");
  const final = finalEvent?.text ?? "";
  const reason = [...events].reverse().find((event) => event.type === "status" && event.phase === "turn_end")?.reason || null;
  const ok = result.code === 0 && Boolean(finalEvent);
  const parseError = events.length === 0 ? "DSH emitted no parseable JSON events" : finalEvent ? null : "DSH emitted no final event";
  let persisted = true;
  let persistenceError = null;
  if (resolvedSession) {
    try {
      safeSessionId(resolvedSession);
      await updateRegistry(async (registry) => {
        const previous = registry.sessions.find((item) => item.sessionId === resolvedSession);
        const record = { sessionId: resolvedSession, cwd: realCwd, createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), exitCode: result.code, ok };
        registry.sessions = [record, ...registry.sessions.filter((item) => item.sessionId !== resolvedSession)].slice(0, 100);
      });
    } catch (error) {
      persisted = false;
      persistenceError = error.message;
    }
  }
  return { ok, sessionId: resolvedSession, cwd: realCwd, exitCode: result.code, final, reason, parseError, stdoutTail: parseError ? result.stdout.slice(-4000) : "", stderr: result.stderr.trim(), persisted, persistenceError };
}

const taskProperties = {
  task: { type: "string", description: "Bounded task with acceptance checks and stop conditions." },
  cwd: { type: "string", description: "Absolute local workspace inside DSH_BRIDGE_ROOTS." },
  remote_scope: { type: "string", description: "Exact authorized remote scope. Defaults to none." },
  timeout_seconds: { type: "integer", minimum: 10, maximum: 7200, default: 900 },
};

const tools = [
  { name: "dsh_status", description: "Check the DSH CLI and workspace policy without running a model task.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "dsh_task", description: "Delegate one bounded task to DSH.", inputSchema: { type: "object", properties: taskProperties, required: ["task", "cwd"], additionalProperties: false } },
  { name: "dsh_resume", description: "Continue a session created by this bridge.", inputSchema: { type: "object", properties: { session_id: { type: "string" }, ...taskProperties }, required: ["session_id", "task", "cwd"], additionalProperties: false } },
  { name: "dsh_sessions", description: "List bridge-created session metadata; task content is not stored.", inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, additionalProperties: false } },
];

async function callTool(name, args = {}, requestId) {
  if (name === "dsh_status") {
    const command = invocation("version");
    try {
      const result = await runProcess(command.command, command.args, { env: command.env, timeoutMs: 15_000 });
      const version = `${result.stdout}\n${result.stderr}`.match(/\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/)?.[0] || null;
      return { cliAvailable: result.code === 0, cli: process.env.DSH_CLI_PATH || "dsh", version, roots: parseRoots(process.env.DSH_BRIDGE_ROOTS), contractPath };
    } catch (error) {
      return { cliAvailable: false, cli: process.env.DSH_CLI_PATH || "dsh", version: null, roots: parseRoots(process.env.DSH_BRIDGE_ROOTS), contractPath, error: error.message };
    }
  }
  if (name === "dsh_task") return runDsh({ task: args.task, cwd: args.cwd, remoteScope: args.remote_scope, timeoutSeconds: args.timeout_seconds, requestId });
  if (name === "dsh_resume") {
    const registry = await loadRegistry();
    const requestedRealCwd = await fs.realpath(args.cwd);
    if (!registry.sessions.some((item) => item.sessionId === args.session_id && canonical(item.cwd) === canonical(requestedRealCwd))) throw new Error("session and workspace were not created together by this bridge");
    return runDsh({ task: args.task, cwd: args.cwd, remoteScope: args.remote_scope, timeoutSeconds: args.timeout_seconds, sessionId: args.session_id, requestId });
  }
  if (name === "dsh_sessions") return { sessions: (await loadRegistry()).sessions.slice(0, Math.min(Math.max(Number(args.limit) || 20, 1), 100)) };
  throw new Error(`unknown tool: ${name}`);
}

function send(message) { process.stdout.write(`${JSON.stringify(message)}\n`); }

async function handle(message) {
  if (message.method === "notifications/initialized") return;
  if (message.method === "notifications/cancelled") { terminateTree(activeChildren.get(message.params?.requestId)); return; }
  if (message.method === "initialize") return send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: message.params?.protocolVersion || "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "autodl-agent-lab-dsh-bridge", version: "0.1.0" } } });
  if (message.method === "ping") return send({ jsonrpc: "2.0", id: message.id, result: {} });
  if (message.method === "tools/list") return send({ jsonrpc: "2.0", id: message.id, result: { tools } });
  if (message.method === "tools/call") {
    try {
      const result = await callTool(message.params?.name, message.params?.arguments || {}, message.id);
      return send({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } });
    } catch (error) {
      return send({ jsonrpc: "2.0", id: message.id, result: { isError: true, content: [{ type: "text", text: error.stack || error.message }] } });
    }
  }
  if (message.id != null) send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Method not found: ${message.method}` } });
}

async function main() {
  if (process.argv.includes("--self-check")) {
    const status = await callTool("dsh_status");
    if (!status.cliAvailable || !status.version) throw new Error("DSH CLI is unavailable");
    if (status.roots.length === 0) throw new Error("DSH_BRIDGE_ROOTS is empty");
    await fs.access(contractPath);
    process.stdout.write(`${JSON.stringify({ ok: true, ...status }, null, 2)}\n`);
    return;
  }
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    try { void handle(JSON.parse(line)).catch((error) => send({ jsonrpc: "2.0", id: null, error: { code: -32603, message: error.message } })); }
    catch (error) { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } }); }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
}
