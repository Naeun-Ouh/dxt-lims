# Disposable integration environment

This harness provisions **AGENT TEST ONLY** data. Automated results are not Human acceptance. It never loads a project `.env` file, connects to an existing database, or modifies an existing UAT server.

Prerequisites: the runtime integration branch contains approved migrations 017 and 018, Node 22+, installed dependencies, native PostgreSQL 18, and ignored `.openai/hosting.json` for local hosting.

Create a new cluster using a newly allocated localhost port:

```sh
DXT_POSTGRES_BIN=/path/to/postgres18/bin node scripts/disposable-integration.mjs create --new-empty-only
```

The harness refuses a nonempty database, applies ordered checked-in migrations with an exact-byte SHA-256 ledger, seeds existing exact configuration fixtures, and creates explicitly labeled generic Specimen and Wafer Studies. Each has a process-only Run and a configured Measurement Run, two Subjects, and explicit operation applicability. No Target or Next Action is created. Values come from the existing catalog fixture; they are test data, not product defaults.

The writer and read-only viewer have explicit independent configuration visibility and Study grants. Responsibility alone grants no scientific write capability. The manifest records exact routes and migration names under the new ignored `tmp/agent-integration-*` directory.

Start separate writer, read-only viewer, and completely denied servers from that environment:

```sh
node scripts/disposable-integration.mjs start /absolute/project/tmp/agent-integration-XXXXXX/environment.json
```

A third principal has no Sample or Study visibility grants for no-leak checks. Servers run isolated tracked-source copies and local Vite caches. `servers.json` records allocated URLs and PIDs; `routes.json` records path suffixes. Inspect each route in KO and EN, save/read back Actual and Measurement with the writer, and confirm the viewer remains read-only. Neither server counts as Human acceptance.

The harness deliberately leaves its cluster and logs available for diagnosis. Stop only the exact PIDs/data directory listed in its own environment files when the facilitator is finished. Do not stop or clear previous UAT environments. New source changes require a newly started source copy.
