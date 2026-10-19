# AutoDL remote operations

Use `ssh autodl "command"` for remote commands. Prefer short, inspectable commands or a project-local script invoked over SSH. For a long compound command, write and review a script in the project instead of building fragile nested shell quoting.

## Preflight and downloads

Check noninteractive SSH (`ssh -o BatchMode=yes -o ConnectTimeout=10 autodl "true"`), existing paths/jobs, free disk, GPU with `ssh autodl "nvidia-smi"`, environment versions, and target config. Resolve host identity or authentication errors before remote mutation. Preserve installed working CUDA/PyTorch combinations unless the experiment requires a change.

For models, reuse a complete verified copy first. For new downloads, prefer the official ModelScope repository, then `https://hf-mirror.com/`, then Hugging Face. Verify that the candidate is the intended model revision and compatible tokenizer/config, rather than substituting a similarly named conversion. Record the selected source and revision. For datasets, use the official or canonical distribution and record the exact version, split, license, and transformations. Verify expected files and sizes; use hashes or repository metadata where available. Keep resumable partial files inside the owning project's data directory and never treat a partial download as a valid asset.

AutoDL's [academic network accelerator](https://api.autodl.com/docs/network_turbo/) can help GitHub and Hugging Face downloads: in the affected remote Bash command, use `source /etc/network_turbo` when present, then fall back to direct access if needed. Scope proxy variables to the download command and never print them. Put `HF_HOME`, other caches, virtual environments, and large assets under `/root/autodl-tmp/<project>/`; [AutoDL's Hugging Face guidance](https://www.autodl.com/docs/huggingface/) recommends the data disk for caches. Use package mirrors pragmatically and record installed versions.

## Launch and observe

Allocate a unique session name and run ID; verify neither is already in use. Save the exact command and resolved config before launch. A shell wrapper should change into the project directory, activate the intended environment, run the command, direct stdout/stderr to `runs/<run_id>/train.log`, write its numeric exit status to `runs/<run_id>/exit_code`, and exit with the same status. Ensure a failing pipeline is not masked by `tee` (use `pipefail` or direct redirection). Launch that wrapper detached:

```text
ssh autodl "tmux new-session -d -s <session> 'bash /root/llm_safety_exp/<project>/runs/<run_id>/launch.sh'"
ssh autodl "tmux capture-pane -t <session> -p -S -200"
ssh autodl "nvidia-smi"
```

The durable log and status file are authoritative; tmux pane capture is a quick view and may disappear when the session ends. A missing session alone does not prove success. Read logs and GPU state at useful intervals until completion or user-requested handoff; confirm the exit code and expected artifact. Before stopping a session, confirm its name and command belong to the intended run, then use `ssh autodl "tmux kill-session -t <session>"`. Record that cancellation separately from failure.

## Failure and resume

Retain full tracebacks and failed-run files. For OOM, inspect competing GPU processes, actual sequence lengths, precision, batch/accumulation settings, and checkpointing options. Prefer a smaller microbatch with compensating gradient accumulation when feasible; changes to sequence length or data alter the experiment and need explicit reporting. Retry only after a reasoned change, using a new run ID and parent-run link; default to at most two configuration retries before reporting the blocker unless the user requests a wider search. For other errors, fix the cause and rerun smoke validation. Before resuming a checkpoint, verify files, supported optimizer/recipe state, matching code/config/data, and disk space. If only inference weights exist, start a new training run rather than claiming an exact resume.
