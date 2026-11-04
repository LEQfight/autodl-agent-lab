# Local agent orchestration for remote research

Use this guide when the coordinating agent delegates part of an AutoDL research task. Agents stay on the local development machine; the AutoDL instance is an SSH execution target. The same project, reproducibility, tmux, and safety rules apply regardless of which agent writes the code.

## Method selection

Choose the smallest execution mode that fits the task.

| Need | Primary method | Switch condition | Fallback |
| --- | --- | --- | --- |
| Bounded implementation, test repair, or repository exploration | DSH through an available headless/MCP bridge | DSH is unavailable, unauthenticated, outside its workspace allowlist, or unsuitable for the task | Host-native subagent |
| Independent review, research, or parallel read-only checks | Host-native subagent with a narrow deliverable | Native delegation is unavailable or the task is too small to justify a handoff | Coordinating agent performs it directly |
| Several independent workstreams | Separate worktrees or disjoint file ownership | Isolation cannot be guaranteed | Run the workstreams sequentially |
| Remote GPU execution | The assigned owner invokes `ssh <host-alias> "command"` under this skill | Delegation is unavailable | Coordinating agent invokes the same command directly |

Availability is a routing input, not a reason to weaken the workflow. Check a DSH bridge with its status tool before the first delegation. Do not assume a particular tool name; use the host's discovered DSH task/resume operations. A desktop-only session is not a substitute for verified headless authentication. Keep provider tokens in the user's credential store or private environment, never in the repository or delegated prompt.

Prefer direct execution for a tiny, low-risk change that would cost more to specify and review than to implement. Prefer delegation when the task has a concrete artifact, can be tested independently, and benefits from a separate implementation context. Use multiple agents only when their outputs are genuinely independent or isolated.

## Delegation contract

Before granting write ownership, supply all fields that change what the worker may do:

```markdown
Objective: one observable outcome
Workspace: absolute local repository/worktree
Remote scope: none, read-only, or the exact authorized AutoDL operations
AutoDL host alias: canonical `<gpu-model>-<gpu-count>-<ssh-port>` alias when remote scope is granted
Allowed changes: files/directories and external systems
Acceptance checks: commands plus expected artifacts or behavior
Budget: time, tokens, network, and GPU limits when relevant
Utilization gate: warmup boundary, throughput measure, method invariants, and escalation condition for GPU work
Confirmation boundary: destructive or high-impact actions that must stop for the user
Stop conditions: completion, repeated failure, ambiguity, or budget limit
Handoff: outcome, changed files, checks, diff state, run IDs, logs, artifacts, deviations, blocker, next action
```

Give the worker only the access needed for that contract. For DSH, use an absolute workspace inside the bridge allowlist. Resume an existing DSH session only when its workspace, task lineage, and ownership still match; otherwise start a new session. A new objective or different repository gets a new session.

## Ownership and review gate

Use one writer per file or worktree. The coordinating agent does not edit owned files while a worker is active. Parallel writers use separate worktrees or explicitly disjoint paths; shared generated outputs and environment files still count as conflicts.

After handoff, the coordinating agent:

1. reads repository instructions and current Git status;
2. inspects the actual diff and unexpected files instead of trusting the summary;
3. reruns checks proportional to risk, including a cheap end-to-end smoke path for experiment code;
4. verifies that configs, commands, inputs, logs, metrics, and artifact paths are recorded;
5. accepts the work, returns a focused correction, or restores ownership without silently rewriting the worker's result.

A worker's success message is evidence to inspect, not proof of completion. Do not accept an experiment claim until the reported artifact and metric can be reconstructed under the saved protocol.

## Remote delegation

The local Git repository is the source of truth. **Primary:** deploy a reviewed, pinned commit to AutoDL. **Fallback when the remote cannot access the Git origin or the code is intentionally unpublished:** send a reviewed archive, verify its hash, and record the local revision or diff. A necessary remote-only hotfix must be captured back into local Git before more work proceeds.

A delegated worker may use AutoDL only when the contract explicitly grants remote scope. It must inspect GPU, disk, environment, active tmux sessions, and existing artifacts before launch. Long downloads, preprocessing, training, inference, and evaluation use unique detached tmux sessions with durable logs and numeric exit codes. After warmup, it must evaluate the utilization gate before leaving an expensive job unattended. The handoff includes session name, run ID, exact command, log, exit-code file, utilization/throughput summary, bottleneck evidence, tuning lineage, and artifact paths. A missing session is not evidence of success.

For failures, preserve the traceback and failed run. Diagnose before a bounded retry, create a new run ID, link it to the parent, and record every changed parameter. DSH, native subagents, and the coordinating agent all stop at the same user-confirmation boundaries defined in `SKILL.md`.
