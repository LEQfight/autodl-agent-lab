# Optional DSH MCP bridge

This local stdio bridge lets a coordinating Agent delegate a bounded task to DeepSeek Harness headless. It exposes `dsh_status`, `dsh_task`, `dsh_resume`, and `dsh_sessions`, injects the repository's worker contract, validates the real starting workspace against an allowlist, prevents concurrent tasks in the same workspace within one bridge process, and stores only session metadata under `.state/`. It intentionally does not retain prompts or model output; the coordinating host must save any handoff that belongs in the research record.

Requirements: Node.js 18 or newer, a working `dsh` CLI/headless profile, and a provider credential kept in Harness or the user's private environment. The bridge has been exercised with DSH `0.2.1-rc.2`; verify its JSON event contract when using another release. Never put a token in this repository or MCP arguments.

Configure the host's MCP server with:

- command: the local Node executable;
- args: the absolute path to `server.mjs`;
- `DSH_CLI_PATH`: the DSH executable path, or omit it when `dsh` is on `PATH`;
- `DSH_BRIDGE_ROOTS`: one or more allowed absolute workspace roots separated by the operating system path delimiter;
- `DSH_BRIDGE_STATE_DIR`: optional writable directory for session metadata (defaults to `.state/` beside the bridge);
- a tool timeout long enough for the delegated task and approval mode `prompt` when the host supports it.

Example Codex TOML (replace every placeholder):

```toml
[mcp_servers.deepseek_harness]
command = '<absolute-node-path>'
args = ['<absolute-repo-path>/integrations/dsh-bridge/server.mjs']
startup_timeout_sec = 20
tool_timeout_sec = 7200
default_tools_approval_mode = 'prompt'

[mcp_servers.deepseek_harness.env]
DSH_CLI_PATH = '<absolute-dsh-cli-path>'
DSH_BRIDGE_ROOTS = '<absolute-allowed-workspace-root>'
```

Validate before delegation:

```text
node --test integrations/dsh-bridge/tests/bridge.test.mjs
node integrations/dsh-bridge/server.mjs --self-check
```

The bridge validates the task's starting directory; it is not a general operating-system sandbox. Configure DSH and the MCP host with the narrowest file, shell, and network permissions they support, use one bridge process per workspace set, and keep disjoint work in separate worktrees. The bridge defaults each task's injected remote scope to `none`. A task may use `ssh autodl "command"` only when its `remote_scope` and delegation contract explicitly authorize it. The coordinating agent still reviews the actual diff and reruns proportionate checks before accepting the result.
