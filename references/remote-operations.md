# AutoDL method selection and remote operations

All remote commands use the resolved instance alias: `ssh <host-alias> "command"`. Prefer short commands or a reviewed project script. Use the methods below in order; a fallback is justified by its stated failure condition, not convenience alone.

## SSH alias identity

For every new or refreshed AutoDL connection, name the local SSH `Host` as `<gpu-model>-<gpu-count>-<ssh-port>`. NVIDIA is the default vendor, so omit `NVIDIA`, `GeForce`, and `RTX` when a familiar model token remains: for example, `NVIDIA H100` with one GPU on port `36542` becomes `H100-1-36542`, and `NVIDIA GeForce RTX 4080` on port `25762` becomes `4080-1-25762`. Preserve meaningful suffixes such as `SXM`, `PCIe`, or `Ti` only when they distinguish the allocated model. Use the allocated GPU count and the actual external SSH port. If the inventory is mixed or the resulting alias already names another endpoint, stop and ask for a disambiguating model token instead of overwriting an existing block.

```sshconfig
Host H100-1-36542
    HostName <instance-hostname>
    User <remote-user>
    Port 36542
    IdentityFile <private-key-path>
    IdentitiesOnly yes
    BatchMode yes
    ConnectTimeout 10
```

**Primary:** obtain the model, GPU count, and port from the AutoDL allocation, create the canonical alias, then verify it with `ssh -o BatchMode=yes <host-alias> "true"`. After connecting, confirm the inventory with `nvidia-smi --query-gpu=name --format=csv,noheader` and `nvidia-smi -L`; correct the alias if the declared allocation was wrong. Record the resolved alias in the project README, connection metadata, or run manifest so every agent uses the same endpoint.

**Migration:** when a working block uses a generic name such as `autodl`, first add the canonical block with the same verified connection fields. Test the new alias, update project scripts and active task contracts, and only then retire the generic block after confirming that no current job or automation depends on it. Never silently overwrite another `Host` block.

## Access and storage

**Primary:** verify key-based, noninteractive SSH with `ssh <host-alias> "true"` and the alias's `BatchMode` and `ConnectTimeout` settings; inspect `nvidia-smi`, `df -h`, the project path, and active tmux sessions. **Fallback when the alias fails:** check the instance's current SSH address/port in AutoDL, update the canonical alias and host-key trust after verifying identity, then retry. Recompute the alias if the external port or GPU allocation changed. Do not bypass a host-key warning or place passwords in scripts.

AutoDL's `/root/autodl-tmp` is commonly the data location, but inspect its mount and free space: instance types differ. The code root may live on the system disk. AutoDL documents that resetting a standard instance clears system-disk files, and releasing an instance can clear all local files. **Primary:** keep code/configuration in Git and run records, logs, checkpoints, and large working assets on the verified data location. **Fallback when that location is absent or too small:** use another verified mounted storage path and record it; do not silently fill the system disk. For valuable outputs, use a user-approved durable backup destination; if unavailable, offer a verified local copy over SSH before instance release or destructive maintenance and report any remaining risk. See [AutoDL storage rules](https://www.autodl.com/docs/instance_data/) and [instance types](https://www.autodl.com/docs/instance_pro_data/).

## Code and environment

**Primary:** deploy versioned project code from its Git remote at a pinned commit. **Fallback when code is unpublished or Git access fails:** transfer a reviewed source archive through SSH, verify its manifest/hash on the host, and record the local revision or diff. Keep transfer staging inside the project. For a tiny correction, a reviewed remote edit is acceptable if the resulting diff is saved back to the source repository.

**Primary:** reuse a compatible project-specific environment recorded in the run manifest. **Fallback when missing or incompatible:** create an isolated environment from pinned requirements or a lockfile, using a package mirror if the normal index is slow; verify imports and GPU runtime with a smoke test. Avoid changing a working base CUDA/PyTorch installation to solve an unrelated package issue. If a compatible isolated environment cannot be established, report the blocker before an expensive run.

## Models and datasets

**Primary:** reuse a complete, verified local model or dataset. For a new model, try the official ModelScope repository first when it carries the requested revision. **Fallback when absent, incomplete, or incompatible:** use the matching Hugging Face mirror revision, then Hugging Face directly. For datasets and benchmarks, prefer the canonical publisher; use a mirror only when identity, version, splits, and license can be verified. A similarly named conversion is not an automatic substitute.

For GitHub or Hugging Face transfers, first run the affected Bash command with AutoDL's `source /etc/network_turbo` when available; [AutoDL documents the supported domains and limits](https://api.autodl.com/docs/network_turbo/). If it is unavailable, fails, or stalls, retry direct access or the next verified source. Scope proxy variables to that command and do not print them. Put `HF_HOME` and other large caches under the selected large-asset root; [AutoDL documents this for Hugging Face caches](https://www.autodl.com/docs/huggingface/). Use resumable downloads with bounded retries, then verify expected files, sizes, and hashes or repository metadata before use. Preserve partial files separately from usable assets.

## Long jobs, monitoring, and recovery

**Primary:** run long downloads, preprocessing, training, and evaluation in a uniquely named detached tmux session. A project-local launcher enters the project, activates the environment, streams stdout/stderr to both the pane and a durable log with `tee`, writes a numeric exit code, and exits with that code. Use `pipefail` or capture the command's pipeline status so `tee` cannot mask a failure. Save the command and resolved config before launch. **If tmux is missing:** install it and repeat preflight. If installation is blocked, stop and report; a foreground run is not a fallback for a long job.

```text
ssh <host-alias> "tmux new-session -d -s <session> 'bash <run_dir>/launch.sh'"
ssh <host-alias> "tmux capture-pane -t <session> -p -S -200"
ssh <host-alias> "nvidia-smi"
```

**Primary monitoring:** inspect the durable log, exit-code file, expected artifacts, and GPU state. **Fallback when the live log is temporarily unavailable:** inspect `tmux capture-pane`; pane text is supplementary and may disappear on exit. A missing session is not proof of success. Confirm ownership before `ssh <host-alias> "tmux kill-session -t <session>"`, and mark user-requested cancellation separately from failure.

Retain full tracebacks and failed runs. For OOM, inspect other GPU processes and memory demand; try a smaller microbatch with compensating accumulation when the method permits it. If still insufficient, consider checkpointing, precision, or a more memory-efficient training method as a new, explicitly labeled variant. Changing sequence length, model, or data changes the experiment and must be reported. Use a new run ID and parent-run link for each retry; default to at most two configuration retries before reporting the blocker unless the user requests more.

**Primary resume:** continue from a verified checkpoint containing the state required by the framework, with matching code/config/data. **Fallback when only model or adapter weights exist:** begin a new run initialized from those weights and label it warm-start, not exact resume. Inspect disk space and checkpoint integrity before either path.
