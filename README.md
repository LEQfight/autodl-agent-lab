# AutoDL Agent Lab

**Make your AutoDL GPU instance a reproducible research workspace for AI coding agents.**

An open Agent Skill for [Codex](https://learn.chatgpt.com/docs/build-skills), [Claude Code](https://code.claude.com/docs/en/skills), and [Cursor](https://cursor.com/help/customization/skills). Give the agent a research task; this skill guides it through SSH access, project setup, versioned code transfer, model and data preparation, detached jobs, monitoring, recovery, evaluation, and a traceable handoff. It uses the agent's shell and your `autodl` SSH alias. No MCP server or task-specific training framework is required.

> **One workflow, from research question to inspectable run.** The skill is a set of instructions and operating rules, not a hosted service or a claim that every experiment will succeed without intervention.

## Why use it?

- **Research runs that can be checked.** Record the source revision, resolved configuration, data identity, command, logs, exit status, metrics, and artifact paths for each substantial run. Keep baselines, ablations, and retries distinct.
- **A project that stays organized.** Keep code and configuration in the project; place each run's outputs in its own directory; put large assets on storage verified for the current AutoDL instance. Existing projects keep their own conventions when they are coherent.
- **Agent-driven remote operations.** Deploy pinned Git revisions, or transfer and verify a source archive when Git is unavailable. Use detached `tmux` sessions for long jobs and durable logs for monitoring after the terminal disconnects.
- **Recovery with an audit trail.** Diagnose failures, use bounded retries, and resume only from compatible, verified checkpoints. A run started from weights alone is labeled as a new warm-start run.
- **AutoDL-aware fallbacks.** Check GPU and disk before spending compute; use AutoDL's network accelerator when appropriate; reuse verified local assets, then try matching ModelScope, Hugging Face mirror, or Hugging Face sources under documented conditions.
- **Useful across LLM research tasks.** The workflow covers data preparation, fine-tuning, inference, benchmarking, and analysis while adapting to the project's own framework and evaluation protocol.

The method and fallback conditions are specified in [remote operations](references/remote-operations.md). [Research practice](references/research-practice.md) covers project structure, reproducibility, evaluation, and reporting. [SKILL.md](SKILL.md) is the agent entrypoint.

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
git clone https://github.com/LEQfight/autodl-ssh-experiments.git ~/.agents/skills/autodl-ssh-experiments
```

Use the same `git clone` command with the Claude Code or Cursor personal path above for those tools. If the destination already exists, update that checkout instead of cloning over it. On Windows, `~` means your user home directory in the shell you use. Keep `SKILL.md` and `references/` together. If the skill is not discovered, refresh or restart the agent.

The installation paths and skill discovery behavior come from the official [Codex](https://learn.chatgpt.com/docs/build-skills), [Claude Code](https://code.claude.com/docs/en/skills), and [Cursor](https://cursor.com/help/customization/skills) documentation. Agent behavior still depends on the host's tool permissions and available shell/SSH access.

## Connect AutoDL

Create your own SSH key, add its public key to the instance's `~/.ssh/authorized_keys`, and add an alias to your **local** SSH config (replace every placeholder):

```sshconfig
Host autodl
    HostName <your-instance-hostname>
    User <your-remote-user>
    Port <your-ssh-port>
    IdentityFile <path-to-your-private-key>
    IdentitiesOnly yes
    BatchMode yes
    ConnectTimeout 10
```

Check noninteractive access with `ssh autodl "true"`. Install `tmux` on the instance for long jobs. For a new root-user project, the suggested code root is `/root/llm_research/<project>`; an existing project keeps its own path. Inspect the instance's actual storage before using `/root/autodl-tmp/<project>` for large assets and run records. Adapt these paths for other users or mounts.

## Run a research task

Ask the agent to use `autodl-ssh-experiments` and state the target, dataset, metric, and any budget or constraints. For example:

> Use the autodl-ssh-experiments skill to reproduce an LLM benchmark on my AutoDL host. Inspect the project, GPU, and storage; save the exact configuration and data revision; run a smoke check, then launch the experiment in tmux. Monitor it and report metrics, logs, artifacts, and any deviations from the benchmark protocol.

In Codex, you can explicitly mention `$autodl-ssh-experiments`; in Claude Code, use `/autodl-ssh-experiments`. Cursor can load the skill when its description matches the task. The skill asks before destructive dataset or checkpoint deletion and bulk overwrite. A paused experiment stays paused until you resume it.

## Scope and security

This repository contains instructions, not models, datasets, experiment results, credentials, or a preconfigured server. Keep private keys, passwords, tokens, local SSH config, model files, datasets, and run outputs outside this repository. Check the model and dataset terms before sharing derived artifacts.

## 中文简介

**AutoDL Agent Lab：让 Codex、Claude Code、Cursor 等 AI Agent 通过同一份 Skill 管理 AutoDL 远程大模型科研。** 它把 SSH 连接、工程化目录、代码版本与传输、模型和数据准备、`tmux` 后台任务、日志、监控、故障恢复、评测及交付串成可追溯的实验流程。按明确条件选择主方法与备用方法，适配已有项目和不同研究任务；无需 MCP。使用前配置自己的 `autodl` SSH 别名并检查实例存储。本仓库不包含账号密钥或实验产物。

Licensed under the [MIT License](LICENSE).
