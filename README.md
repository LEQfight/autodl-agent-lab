# AutoDL SSH Research Experiments

A Codex skill for reproducible large-language-model research on an AutoDL GPU instance through the SSH alias `autodl`. It covers project setup, provenance, detached tmux jobs, monitoring, evaluation, and handoff. No MCP server is required.

The skill is a workflow, not a training framework or a task-specific recipe. It adapts to an existing project's native tools and supports data preparation, fine-tuning, inference, benchmarking, and analysis. It does not include models, datasets, experiment results, credentials, or a preconfigured server.

## Install

If the target directory does not exist, clone this repository into your Codex skills directory:

```bash
git clone https://github.com/LEQfight/autodl-ssh-experiments.git ~/.codex/skills/autodl-ssh-experiments
```

If Git is unavailable, copy the repository files instead, keeping `SKILL.md` and `references/` together:

```text
~/.codex/skills/autodl-ssh-experiments/
  SKILL.md
  references/
    remote-operations.md
    research-practice.md
```

On Windows, the default location is `%USERPROFILE%\.codex\skills\autodl-ssh-experiments`. Restart or refresh Codex if the skill is not discovered immediately.

## Configure your host

Create your own SSH key and add its public key to the server's `~/.ssh/authorized_keys`. Add an alias to your local SSH config (replace every placeholder):

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

Verify noninteractive access with `ssh autodl "true"`. For a new root-user project, the suggested code root is `/root/llm_research/<project>`; an existing project keeps its own path. Inspect the instance's storage before using `/root/autodl-tmp/<project>` for run records and large assets, since AutoDL instance types differ. Adapt both paths when using another remote user. Install `tmux` on the server before long jobs.

## Use

Ask Codex to use `$autodl-ssh-experiments` for a concrete experiment, for example:

> Use $autodl-ssh-experiments to reproduce an LLM benchmark on my AutoDL host. Inspect the project and GPU, choose the documented primary method and fallback, run it in tmux, then report the protocol, metrics, and artifacts.

The entrypoint is [SKILL.md](SKILL.md). [Research practice](references/research-practice.md) covers reproducibility and evaluation; [remote operations](references/remote-operations.md) covers downloads, tmux, and recovery.

## Safety and scope

The skill asks before destructive dataset or checkpoint deletion and bulk overwrite. Keep private keys, passwords, tokens, local SSH config, model files, datasets, and run outputs outside this repository. Review the experiment's data license and model terms before sharing derived artifacts.

## 中文简介

这是一份通过 `ssh autodl` 调度 AutoDL 远程大模型科研实验的 Codex Skill。它适用于不同任务与训练框架，按明确条件选择主方法或备用方法，并组织数据、运行记录和评测。配置自己的 SSH 别名并检查实例存储后使用。仓库不包含服务器账号、密钥、模型、数据集或训练结果。

Licensed under the [MIT License](LICENSE).
