# AutoDL SSH Research Experiments

A Codex skill for running reproducible GPU research on an AutoDL server through the SSH alias `autodl`. It covers experiment design, project layout, model and dataset provenance, detached tmux jobs, monitoring, evaluation, and handoff. No MCP server is required.

The skill is a workflow, not a training framework. It works with an existing project and its native tools, including LLaMA-Factory, Transformers, or custom scripts. It does not include models, datasets, experiment results, credentials, or a preconfigured server.

## Install

Copy this repository into your Codex skills directory, keeping `SKILL.md` and `references/` together:

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
```

Verify noninteractive access with `ssh autodl "true"`. The skill assumes the remote code root is `/root/llm_safety_exp` and the large-file root is `/root/autodl-tmp`. Change those paths in the skill if your account or storage layout differs. Install `tmux` on the server before running long jobs.

## Use

Ask Codex to use `$autodl-ssh-experiments` for a concrete experiment, for example:

> Use $autodl-ssh-experiments to fine-tune a classifier on my AutoDL host. First inspect the existing project and GPU, then prepare a tracked run, train in tmux, evaluate on a held-out split, and report artifacts and metrics.

The entrypoint is [SKILL.md](SKILL.md). [Research practice](references/research-practice.md) covers reproducibility and evaluation; [remote operations](references/remote-operations.md) covers downloads, tmux, and recovery.

## Safety and scope

The skill asks before destructive dataset or checkpoint deletion and bulk overwrite. Keep private keys, passwords, tokens, local SSH config, model files, datasets, and run outputs outside this repository. Review the experiment's data license and model terms before sharing derived artifacts.

## 中文简介

这是一份通过 `ssh autodl` 调度远程 GPU 科研实验的 Codex Skill。配置自己的 SSH 别名后，可用它组织数据、训练、评测与运行记录；大文件和检查点保存在远端数据盘。仓库不包含服务器账号、密钥、模型、数据集或训练结果。

Licensed under the [MIT License](LICENSE).
