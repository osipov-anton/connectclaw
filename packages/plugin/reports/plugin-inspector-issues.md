# OpenClaw Plugin Issue Findings

Generated: deterministic
Status: PASS

## Triage Summary

| Metric               | Value |
| -------------------- | ----- |
| Issue findings       | 6     |
| P0                   | 0     |
| P1                   | 1     |
| Live issues          | 0     |
| Live P0 issues       | 0     |
| Compat gaps          | 0     |
| Deprecation warnings | 2     |
| Inspector gaps       | 4     |
| Upstream metadata    | 0     |
| Contract probes      | 6     |

## Triage Overview

| Class               | Count | P0 | Meaning                                                                                                         |
| ------------------- | ----- | -- | --------------------------------------------------------------------------------------------------------------- |
| live-issue          | 0     | 0  | Potential runtime breakage in the target OpenClaw/plugin pair. P0 only when it is not a deprecated compat seam. |
| compat-gap          | 0     | -  | Compatibility behavior is needed but missing from the target OpenClaw compat registry.                          |
| deprecation-warning | 2     | -  | Plugin uses a supported but deprecated compatibility seam; keep it wired while migration exists.                |
| inspector-gap       | 4     | -  | Plugin Inspector needs stronger capture/probe evidence before making contract judgments.                        |
| upstream-metadata   | 0     | -  | Plugin package or manifest metadata should improve upstream; not a target OpenClaw live break by itself.        |
| fixture-regression  | 0     | -  | Fixture no longer exposes an expected seam; investigate fixture pin or scanner drift.                           |

## P0 Live Issues

_none_

## Live Issues

_none_

## Compat Gaps

_none_

## Deprecation Warnings

- P2 **connectclaw** `deprecation-warning` `core-compat-adapter`
  - **legacy-before-agent-start**: connectclaw: legacy before_agent_start hook compatibility is still used
  - state: open · compat:deprecated · deprecated
  - evidence:
    - before_agent_start @ src/hooks.ts:17

- P2 **connectclaw** `deprecation-warning` `core-compat-adapter`
  - **legacy-root-sdk-import**: connectclaw: root plugin SDK barrel is still used by fixtures
  - state: open · compat:deprecated · deprecated
  - evidence:
    - openclaw/plugin-sdk @ index.ts:1
    - openclaw/plugin-sdk @ src/commands.ts:1
    - openclaw/plugin-sdk @ src/hooks.ts:1
    - openclaw/plugin-sdk @ src/tools.ts:1
    - openclaw/plugin-sdk @ src/tools.ts:2

## Inspector Proof Gaps

- P1 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **registration-capture-gap**: connectclaw: runtime registrations need capture before contract judgment
  - state: open · compat:none
  - evidence:
    - registerCommand @ src/commands.ts:18
    - registerCommand @ src/commands.ts:64
    - registerService @ src/hooks.ts:91

- P2 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **package-dependency-install-required**: connectclaw: cold import requires isolated dependency installation
  - state: open · compat:none
  - evidence:
    - openclaw @ package.json

- P2 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **package-typescript-source-entrypoint**: connectclaw: cold import needs TypeScript source entrypoint support
  - state: open · compat:none
  - evidence:
    - extension:index.ts

- P2 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **runtime-tool-capture**: connectclaw: runtime tool schema needs registration capture
  - state: open · compat:none
  - evidence:
    - registerTool @ src/tools.ts:6

## Upstream Metadata Issues

_none_

## Issues

- P1 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **registration-capture-gap**: connectclaw: runtime registrations need capture before contract judgment
  - state: open · compat:none
  - evidence:
    - registerCommand @ src/commands.ts:18
    - registerCommand @ src/commands.ts:64
    - registerService @ src/hooks.ts:91

- P2 **connectclaw** `deprecation-warning` `core-compat-adapter`
  - **legacy-before-agent-start**: connectclaw: legacy before_agent_start hook compatibility is still used
  - state: open · compat:deprecated · deprecated
  - evidence:
    - before_agent_start @ src/hooks.ts:17

- P2 **connectclaw** `deprecation-warning` `core-compat-adapter`
  - **legacy-root-sdk-import**: connectclaw: root plugin SDK barrel is still used by fixtures
  - state: open · compat:deprecated · deprecated
  - evidence:
    - openclaw/plugin-sdk @ index.ts:1
    - openclaw/plugin-sdk @ src/commands.ts:1
    - openclaw/plugin-sdk @ src/hooks.ts:1
    - openclaw/plugin-sdk @ src/tools.ts:1
    - openclaw/plugin-sdk @ src/tools.ts:2

- P2 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **package-dependency-install-required**: connectclaw: cold import requires isolated dependency installation
  - state: open · compat:none
  - evidence:
    - openclaw @ package.json

- P2 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **package-typescript-source-entrypoint**: connectclaw: cold import needs TypeScript source entrypoint support
  - state: open · compat:none
  - evidence:
    - extension:index.ts

- P2 **connectclaw** `inspector-gap` `inspector-follow-up`
  - **runtime-tool-capture**: connectclaw: runtime tool schema needs registration capture
  - state: open · compat:none
  - evidence:
    - registerTool @ src/tools.ts:6

## Contract Probe Backlog

- P1 **connectclaw** `inspector-capture-api`
  - contract: External inspector capture records service, route, gateway, command, and interactive registrations.
  - id: `api.capture.runtime-registrars:connectclaw`
  - evidence:
    - registerCommand @ src/commands.ts:18
    - registerCommand @ src/commands.ts:64
    - registerService @ src/hooks.ts:91

- P2 **connectclaw** `hook-runner`
  - contract: Legacy before_agent_start remains wired until plugins migrate to before_model_resolve and before_prompt_build.
  - id: `hook.compat.before-agent-start-migration:connectclaw`
  - evidence:
    - before_agent_start @ src/hooks.ts:17

- P2 **connectclaw** `package-loader`
  - contract: Inspector installs package dependencies in an isolated workspace before cold import.
  - id: `package.entrypoint.isolated-dependency-install:connectclaw`
  - evidence:
    - openclaw @ package.json

- P2 **connectclaw** `package-loader`
  - contract: Inspector can compile or load TypeScript source entrypoints before registration capture.
  - id: `package.entrypoint.typescript-loader:connectclaw`
  - evidence:
    - extension:index.ts

- P2 **connectclaw** `sdk-alias`
  - contract: Root plugin SDK barrel remains importable or has a machine-readable migration path.
  - id: `sdk.import.root-barrel-cold-import:connectclaw`
  - evidence:
    - openclaw/plugin-sdk @ index.ts:1
    - openclaw/plugin-sdk @ src/commands.ts:1
    - openclaw/plugin-sdk @ src/hooks.ts:1
    - openclaw/plugin-sdk @ src/tools.ts:1
    - openclaw/plugin-sdk @ src/tools.ts:2

- P2 **connectclaw** `tool-runtime`
  - contract: Registered runtime tools expose stable names, input schemas, and result metadata.
  - id: `tool.registration.schema-capture:connectclaw`
  - evidence:
    - registerTool @ src/tools.ts:6
