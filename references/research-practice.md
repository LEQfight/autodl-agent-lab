# Research workflow and project engineering

Use this guide when setting up or substantially revising a project. Apply only the stages needed for the requested LLM research: data preparation, fine-tuning, inference, evaluation, or analysis. Existing project conventions take priority when they already keep work traceable.

## Project structure

For a new project, use a small, documented layout:

```text
/root/llm_research/<project>/
  README.md              # purpose, setup, commands, artifact map
  configs/               # versioned source configurations
  src/ or scripts/       # task-specific stages
  tests/                 # checks for fragile transforms/parsers
/root/autodl-tmp/<project>/
  datasets/  models/  envs/  cache/
  runs/<run_id>/         # resolved config, manifest, logs, metrics, artifacts, report
```

Inspect the existing repository and storage mount first. Choose one code root and one run/large-asset root; record both in the project README or configuration. These `/root` paths are defaults for standard root-user instances, not migration instructions; adapt them for another user or storage layout. Keep generated files out of source directories, large files out of Git, and each run's outputs together. Use project-local wrappers or extensions around a third-party framework; pin its revision and avoid editing vendored source when possible.

**Primary method:** use the existing framework's native configuration, data format, and entry points. **Fallback when it cannot express the required input, metric, or inference behavior:** add a thin project-local adapter or script. Document the boundary and check the adapter on known examples. Use a simple project layout when starting from scratch; add orchestration or experiment-tracking services only when the project already uses them or their benefit justifies maintenance.

## Reproducibility contract

Before expensive execution, record the question, reproduction target or hypothesis, baseline, comparison, primary metric and direction, success condition, compute budget, and stopping rule. For an ablation, change one factor at a time unless a factorial design is planned. Keep the evaluation protocol comparable.

Pin the source commit; when running uncommitted code, save a diff or snapshot. Capture the command, resolved config and overrides, seed(s), precision, effective batch size when relevant, Python/CUDA/GPU and major package versions. A seed supports comparison but does not guarantee identical results across hardware and kernels.

Identify models, tokenizers, datasets, and benchmarks by canonical source, revision, license or use restriction when relevant, local path, and hash or file manifest. Document sampling, filtering, deduplication, transformations, IDs, and split membership. Check contamination or overlap where it would invalidate a claim. Do not require labels or train/validation/test splits for a task that does not use them.

Keep a machine-readable record at `<run_dir>/manifest.json` or the project's equivalent: run and parent IDs, objective, status, UTC start/end time, exit code, code revision/dirty state, command, resolved config path/hash, environment fingerprint, input identities/revisions/hashes, and output paths. Mark unavailable fields as unavailable. Store metrics and per-example outputs separately, linked by run ID. Keep inference artifacts distinct from resumable checkpoints; the latter need optimizer, scheduler, RNG, or recipe state when supported.

## Checks and evaluation

Separate ingestion, transformation, execution, inference, and scoring into understandable units. Give examples and predictions stable IDs, validate required fields and output shapes, and keep prompt templates and metric formulas in one place. Make preparation idempotent or version its outputs. A smoke check should exercise the shortest complete path needed for the task: inspect sample inputs, run a few steps or requests, reload any saved artifact, and score a tiny known case. Add focused checks for transformations or parsers that can silently change results.

**Primary method:** use the framework or benchmark's native evaluator when it implements the intended protocol. **Fallback when it lacks the required prompt, parsing, metric, or sample-level output:** use a standalone, versioned scorer. Validate the fallback against hand-checked examples and keep its inputs and outputs.

Freeze the final evaluation dataset and metric before comparing results. Tune on training/validation material when available. If a fixed benchmark has no validation split, treat test-guided changes as exploratory and disclose them. Version the protocol whenever inputs, prompts, chat template, decoding, parser, or metric change. For each metric, include its definition, numerator/denominator when applicable, sample count, invalid or missing output policy, and uncertainty or multiple seeds when small differences matter. Do not generalize beyond tested conditions.

Finish with a concise report: setup, deviations, comparison, results, representative failures, resource use, artifact paths, and limitations. A process exit alone is insufficient: verify the relevant artifact can be loaded or inspected and the metric can be reconstructed. Label incomplete runs as partial.

## Primary sources

- [Hugging Face model cards](https://huggingface.co/docs/hub/model-cards) and [dataset cards](https://huggingface.co/docs/hub/datasets-cards): provenance and documented evaluation.
- [Hydra run directories](https://hydra.cc/docs/configure_hydra/workdir/) and [MLflow tracking](https://mlflow.org/docs/latest/tracking): per-run configurations, logs, parameters, metrics, and artifacts.
- [DVC experiment management](https://doc.dvc.org/user-guide/experiment-management): connect parameters and metrics to code/data revisions without storing large assets in Git.
- [torchtune checkpointing](https://github.com/meta-pytorch/torchtune/blob/main/torchtune/training/checkpointing/_checkpointer.py) and [Hugging Face Trainer](https://huggingface.co/docs/transformers/main_classes/trainer): distinguish inference outputs from resumable training state.
- [EleutherAI lm-evaluation-harness task guide](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/new_task_guide.md): version and share the evaluation protocol.
