# AutoDL Agent Lab

**Make your AutoDL GPU instance a reproducible research workspace for AI coding agents.**

An open Agent Skill for [Codex](https://learn.chatgpt.com/docs/build-skills), [Claude Code](https://code.claude.com/docs/en/skills), and [Cursor](https://cursor.com/help/customization/skills). Give the agent a research task; this skill guides it through SSH access, project setup, versioned code transfer, model and data preparation, detached jobs, monitoring, recovery, evaluation, and a traceable handoff. It can work directly, coordinate native subagents, or use DeepSeek Harness (DSH) as a local implementation worker. It uses the agent's shell and a distinct AutoDL SSH alias such as `H100-1-36542`; no remote Agent installation or task-specific training framework is required.

> **One workflow, from research question to inspectable run.** The skill is a set of instructions and operating rules, not a hosted service or a claim that every experiment will succeed without intervention.

## Why use it?

- **Research runs that can be checked.** Record the source revision, resolved configuration, data identity, command, logs, exit status, metrics, and artifact paths for each substantial run. Keep baselines, ablations, and retries distinct.
- **A project that stays organized.** Keep code and configuration in the project; place each run's outputs in its own directory; put large assets on storage verified for the current AutoDL instance. Existing projects keep their own conventions when they are coherent.
- **Agent-driven remote operations.** Deploy pinned Git revisions, or transfer and verify a source archive when Git is unavailable. Use detached `tmux` sessions for long jobs and durable logs for monitoring after the terminal disconnects.
- **Local multi-agent collaboration without losing control.** Keep the planning and review agent local, delegate bounded coding tasks to DSH or native subagents, enforce one-writer ownership, and accept work only after inspecting the real diff and rerunning checks.
- **Recovery with an audit trail.** Diagnose failures, use bounded retries, and resume only from compatible, verified checkpoints. A run started from weights alone is labeled as a new warm-start run.
- **AutoDL-aware fallbacks.** Check GPU and disk before spending compute; use AutoDL's network accelerator when appropriate; reuse verified local assets, then try matching ModelScope, Hugging Face mirror, or Hugging Face sources under documented conditions.
- **Useful across LLM research tasks.** The workflow covers data preparation, fine-tuning, inference, benchmarking, and analysis while adapting to the project's own framework and evaluation protocol.

The method and fallback conditions are specified in [remote operations](references/remote-operations.md). [Research practice](references/research-practice.md) covers project structure, reproducibility, evaluation, and reporting. [Agent orchestration](references/agent-orchestration.md) defines when and how to use DSH, native subagents, or direct execution. [SKILL.md](SKILL.md) is the agent entrypoint.

## Install in your agent

Choose the skill directory your tool loads, then clone the repository into it. These are **local** installation paths; cloud agents may need a committed project skill or their own skill sync setup.

| Tool | Personal skill directory | Project skill directory |
| --- | --- | --- |
| Codex | `~/.agents/skills/autodl-ssh-experiments/` | `.agents/skills/autodl-ssh-experiments/` |
| Claude Code | `~/.claude/skills/autodl-ssh-experiments/` | `.claude/skills/autodl-ssh-experiments/` |
| Cursor | `~/.cursor/skills/autodl-ssh-experiments/` | `.cursor/skills/autodl-ssh-experiments/` |

For example, to install it as a personal Codex skill:

```bash
mkdir -p ~/.agents/skills
git clone https://github.com/LEQfight/autodl-agent-lab.git ~/.agents/skills/autodl-ssh-experiments
```

Use the same `git clone` command with the Claude Code or Cursor personal path above for those tools. The GitHub project is called **AutoDL Agent Lab**; the skill folder and invocation name remain `autodl-ssh-experiments` for existing installations. If the destination already exists, update that checkout instead of cloning over it. On Windows, `~` means your user home directory in the shell you use. Keep `SKILL.md` and `references/` together. If the skill is not discovered, refresh or restart the agent.

The installation paths and skill discovery behavior come from the official [Codex](https://learn.chatgpt.com/docs/build-skills), [Claude Code](https://code.claude.com/docs/en/skills), and [Cursor](https://cursor.com/help/customization/skills) documentation. Agent behavior still depends on the host's tool permissions and available shell/SSH access.

## Connect AutoDL

Create your own SSH key, add its public key to the instance's `~/.ssh/authorized_keys`, and add an alias to your **local** SSH config (replace every placeholder):

```sshconfig
Host H100-1-36542
    HostName <your-instance-hostname>
    User <your-remote-user>
    Port 36542
    IdentityFile <path-to-your-private-key>
    IdentitiesOnly yes
    BatchMode yes
    ConnectTimeout 10
```

Name each new or refreshed alias `<gpu-model>-<gpu-count>-<ssh-port>`. NVIDIA is the default vendor and is omitted, so one H100 on port `36542` is `H100-1-36542`, while one RTX 4080 on port `25762` is `4080-1-25762`. Replace the example port and alias together, then check noninteractive access with `ssh H100-1-36542 "true"`. If migrating from a generic `autodl` block, add and verify the canonical alias before retiring the old one. Install `tmux` on the instance for long jobs. For a new root-user project, the suggested code root is `/root/llm_research/<project>`; an existing project keeps its own path. Inspect the instance's actual storage before using `/root/autodl-tmp/<project>` for large assets and run records. Adapt these paths for other users or mounts.

## Run a research task

Ask the agent to use `autodl-ssh-experiments` and state the target, dataset, metric, and any budget or constraints. For example:

> Use the autodl-ssh-experiments skill to reproduce an LLM benchmark on my AutoDL host. Inspect the project, GPU, and storage; save the exact configuration and data revision; run a smoke check, then launch the experiment in tmux. Monitor it and report metrics, logs, artifacts, and any deviations from the benchmark protocol.

In Codex, you can explicitly mention `$autodl-ssh-experiments`; in Claude Code, use `/autodl-ssh-experiments`. Cursor can load the skill when its description matches the task. The skill asks before destructive dataset or checkpoint deletion and bulk overwrite. A paused experiment stays paused until you resume it.

## Optional DSH or native subagents

Subagents are an execution option, not a requirement. If the host exposes a DSH headless/MCP bridge, the coordinating agent checks its status, sends one bounded task with an absolute allowlisted workspace, waits for the handoff, then independently reviews the Git diff and tests. If DSH is unavailable or unsuitable, it uses a native subagent; if delegation adds no value, it works directly. Agents remain local and reach AutoDL through the same `ssh <host-alias> "command"` boundary.

The bridge or host must keep model credentials outside the repository and should restrict DSH to explicit workspace roots. The skill relies on available task/status/resume capabilities and the contract in [agent orchestration](references/agent-orchestration.md). For Codex or another stdio-MCP host, this repository includes an [optional local DSH bridge](integrations/dsh-bridge/README.md); it is not required when the host already provides equivalent delegation tools.

## Scope and security

This repository contains instructions, not models, datasets, experiment results, credentials, or a preconfigured server. Keep private keys, passwords, tokens, local SSH config, model files, datasets, and run outputs outside this repository. Check the model and dataset terms before sharing derived artifacts.

## Contribute

Improvements to AutoDL operations, reproducibility rules, and cross-agent installation are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for a focused contribution checklist. For a bug, include the agent host, AutoDL instance type, expected behavior, observed behavior, and a redacted reproduction.

## 中文简介

**AutoDL Agent Lab：让 Codex、Claude Code、Cursor 等 AI Agent 通过同一份 Skill 管理 AutoDL 远程大模型科研。** 它把 SSH 连接、工程化目录、代码版本与传输、模型和数据准备、`tmux` 后台任务、日志、监控、故障恢复、评测及交付串成可追溯的实验流程；可由主 Agent 直接执行，也可把边界清晰的任务交给本地 DSH 或 Codex 子 Agent，并由主 Agent 独立验收。按明确条件选择主方法与备用方法，适配已有项目和不同研究任务；远程服务器无需安装 Agent，DSH/MCP 也不是必需依赖。使用前配置自己的 `autodl` SSH 别名并检查实例存储。本仓库不包含账号密钥或实验产物。

Licensed under the [MIT License](LICENSE).
