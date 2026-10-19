# Contributing

AutoDL Agent Lab is an instruction-based Agent Skill. Changes should help an agent make a better decision or produce a more traceable research run without tying the workflow to one model, benchmark, or training framework.

## What to include in a change

- State the problem and the AutoDL or research scenario where it occurs. For a method change, identify the primary method, the condition that triggers its fallback, and what the agent should record.
- Keep `SKILL.md` concise. Put detailed operational guidance in `references/remote-operations.md` and research design guidance in `references/research-practice.md`. Link new references from the entrypoint.
- Preserve the `autodl-ssh-experiments` skill name and folder name unless a migration is planned. Update the README when installation or invocation changes.
- Check that relative links work, the YAML frontmatter follows the [Agent Skills specification](https://agentskills.io/specification), and the example instructions can be followed with shell and SSH access alone.
- Explain how you checked the change. For an AutoDL-specific claim, link the relevant official documentation or describe the instance behavior you observed.

## Privacy and reproducibility

Redact hostnames, ports, usernames, tokens, passwords, private keys, and private dataset paths from issues, logs, examples, and pull requests. Do not commit model weights, datasets, checkpoints, or run outputs. When proposing a workflow change, show how it preserves source revisions, configurations, logs, exit status, and artifact locations.

Open an issue for behavior that depends on an AutoDL instance type or agent host so others can reproduce it before the skill turns it into a general rule.
