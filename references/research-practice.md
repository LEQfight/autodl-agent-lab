# Research and project practice

Use this guide when creating or substantially revising an experiment. Adapt it to the project's framework; do not install Hydra, DVC, MLflow, or another service solely to satisfy this guide.

## Organize by responsibility

Inspect existing conventions first. For a new project, a practical layout is:

```text
/root/llm_safety_exp/<project>/
  README.md                 # objective, setup, commands, artifact map
  configs/                  # versioned source configs
  src/ or scripts/          # preparation, training, inference, scoring
  tests/                    # meaningful data/parser/smoke checks, when warranted
  runs/<run_id>/            # resolved config, manifest, logs, metrics, report
/root/autodl-tmp/<project>/
  datasets/  models/  envs/  cache/
  runs/<run_id>/checkpoints/
```

Keep the source repository, a particular run's small outputs, and large assets separate. Prefer one documented path convention and named configuration fields over hard-coded paths in several scripts. Do not commit model weights, raw large datasets, credentials, or generated caches. A shared external framework checkout may live in `/root/llm_safety_exp/vendor/` with a pinned commit. Avoid modifying vendor code when an extension or project-local wrapper will do.

## Specify and freeze the experiment

- Record the question, hypothesis or replication target, baseline, planned comparison, primary metric and its direction, success criterion, compute budget, and stop condition before expensive execution. Use the paper's stated setting when claiming reproduction; document every departure.
- Pin code commit or record a diff/patch if uncommitted; capture Python, CUDA, GPU, major package versions, training command, resolved config, seed, precision, and effective batch size. A seed improves comparability but does not guarantee bitwise reproducibility across all hardware and kernels.
- Identify every model and dataset by source, repository/revision, license or usage constraint when relevant, local path, and hash or file manifest. Document selection/filtering, deduplication, label mapping, transformation code, class counts, and immutable train/validation/test membership. Check for overlap, including near duplicates when contamination would change the conclusion.
- Keep source configs in version control. Save a resolved copy with each run, including command-line overrides and paths. Use a run ID linked across logs, metrics, reports, and checkpoints. Record status as planned/running/completed/failed/interrupted, with start/end time and exit code.
- Distinguish an inference artifact (model/adapter plus tokenizer and base-model identity) from a resumable training checkpoint (optimizer, scheduler, RNG/recipe state where supported). Test loading the saved artifact before declaring success.

The minimum run record is a small machine-readable manifest at `runs/<run_id>/manifest.json` (or the project's equivalent): run ID and parent ID if retried; objective and baseline ID; status, UTC timestamps, exit code; code revision/dirty state; exact launch command; resolved config path and hash; environment fingerprint; model and dataset identities/revisions; split or input manifest hashes; log, checkpoint, prediction, metric, and report paths. Record unavailable fields explicitly rather than inventing values. Keep generated metrics and per-example predictions as separate files, linked by run ID.

## Build readable stages

Keep ingestion, normalization, split creation, model setup, training, inference, and metric computation in distinct functions or entry points. Use a small documented schema for examples and predictions; validate required fields and allowed labels. Transform data deterministically and preserve original IDs for traceability. Make preparatory steps idempotent or version their outputs. Prefer clear names and a single source of truth for prompts, labels, and metric formulas.

Respect the selected framework's native configuration and data contract rather than forcing a parallel abstraction. For example, LLaMA-Factory registers custom datasets through `dataset_info.json` in its configured `dataset_dir`; keep that registry and the training YAML traceable in the project, while large dataset files may remain on the data disk.

Start with a cheap end-to-end smoke run: inspect several prepared examples, train a few steps if applicable, save and reload an artifact, infer on a handful of inputs, and check scoring against a tiny hand-labeled case. Add automated checks for error-prone transformations or parsers; avoid tests that only repeat implementation text.

## Evaluate and report

Lock the held-out evaluation set and metric before looking at final results. Tune prompts, thresholds, and hyperparameters on training/validation data; record any test-set inspection and treat later test-guided changes as exploratory. Version the evaluation protocol when the dataset, prompt, parser, or metric changes. Keep prompt formatting, generation settings, maximum tokens, answer extraction, and invalid-output policy identical across comparisons. Report numerator, denominator, sample size, and uncertainty or multiple seeds when the decision depends on small differences. For safety classification, include both harmful and benign examples when possible; report false-safe and false-unsafe behavior rather than ASR alone. Do not infer general safety from a small benchmark.

Use a compact run report: setup and deviations; table or machine-readable metrics with metric definitions; loss or learning trace when relevant; representative successes, failures, and invalid outputs; resource use; artifact paths; unresolved limitations. A run is complete only when process outcome, saved artifact, reload/inference, and reported metric are verified. Otherwise label it partial.

## Primary-source patterns behind this guide

- [Hugging Face model cards](https://huggingface.co/docs/hub/model-cards) and [dataset cards](https://huggingface.co/docs/hub/datasets-cards): document provenance, intended use, data, and evaluation.
- [Hydra run directories](https://hydra.cc/docs/configure_hydra/workdir/): retain per-run logs and resolved configuration.
- [MLflow tracking](https://mlflow.org/docs/latest/tracking): group runs and capture parameters, metrics, code versions, and artifacts.
- [DVC experiment management](https://doc.dvc.org/user-guide/experiment-management): associate parameters and metrics with code/data revisions while storing large assets outside Git.
- [torchtune checkpointing](https://github.com/meta-pytorch/torchtune/blob/main/torchtune/training/checkpointing/_checkpointer.py): distinguish model output from training state needed for resume.
- [EleutherAI lm-evaluation-harness task guide](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/new_task_guide.md): make evaluation setup and split/metric choices explicit in shareable task configuration.
- [EleutherAI lm-evaluation-harness interface](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/interface.md): save evaluation settings and model inputs/outputs when interpreting scores.
- [Hugging Face Trainer](https://huggingface.co/docs/transformers/main_classes/trainer): distinguish seeded sampling, deterministic debugging, and exact checkpoint continuation.
- [LLaMA-Factory dataset documentation](https://github.com/hiyouga/LlamaFactory/blob/main/data/README.md): honor the framework's dataset registry and format instead of assuming every trainer accepts the same schema.
