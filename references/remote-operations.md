# AutoDL method selection and remote operations

All remote commands use the configured `autodl` SSH alias. Prefer short commands or a reviewed project script invoked with `ssh autodl "command"`. Use the methods below in order; a fallback is justified by its stated failure condition, not convenience alone.

## Access and storage

**Primary:** verify key-based, noninteractive SSH with `ssh autodl "true"` and the alias's `BatchMode` and `ConnectTimeout` settings; inspect `nvidia-smi`, `df -h`, the project path, and active tmux sessions. **Fallback when the alias fails:** check the instance's current SSH address/port in AutoDL, update the local alias and host-key trust after verifying identity, then retry. Do not bypass a host-key warning or place passwords in scripts.

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
ssh autodl "tmux new-session -d -s <session> 'bash <run_dir>/launch.sh'"
ssh autodl "tmux capture-pane -t <session> -p -S -200"
ssh autodl "nvidia-smi"
```

**Primary monitoring:** inspect the durable log, exit-code file, expected artifacts, and GPU state. **Fallback when the live log is temporarily unavailable:** inspect `tmux capture-pane`; pane text is supplementary and may disappear on exit. A missing session is not proof of success. Confirm ownership before `ssh autodl "tmux kill-session -t <session>"`, and mark user-requested cancellation separately from failure.

Retain full tracebacks and failed runs. For OOM, inspect other GPU processes and memory demand; try a smaller microbatch with compensating accumulation when the method permits it. If still insufficient, consider checkpointing, precision, or a more memory-efficient training method as a new, explicitly labeled variant. Changing sequence length, model, or data changes the experiment and must be reported. Use a new run ID and parent-run link for each retry; default to at most two configuration retries before reporting the blocker unless the user requests more.

**Primary resume:** continue from a verified checkpoint containing the state required by the framework, with matching code/config/data. **Fallback when only model or adapter weights exist:** begin a new run initialized from those weights and label it warm-start, not exact resume. Inspect disk space and checkpoint integrity before either path.
