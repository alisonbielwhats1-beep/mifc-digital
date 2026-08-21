# ChatGPT project context

This directory is a local mirror of the ChatGPT project “MIFC Digital”.

- Treat every file under `sources/` as read-only reference material.
- Do not edit, rename, move, or delete synced project files.
- These files may be replaced the next time a task is created from this ChatGPT project.


## Project instructions

- Before changing the project, read `PROJECT-HANDOFF.md` and `docs/CURRENT-STATUS.md`.
- Treat `docs/layout-card-lineage.csv`, `docs/layout-measure-catalog.csv`, and `docs/client-process-matrix.csv` as the lineage for the client/process lanes in `/mifc/layout`.
- A raised client line means that the customer participates in that process stage. A flat line means no mapped participation. Never infer a route that is absent from the PBIP lineage; mark uncertainty as `pending`.
- Preserve process-time measures separately from stock/logistics measures. Do not present placeholders or unavailable MES values as observed production data.
- Keep middle-button drag available as canvas pan from any canvas element, and preserve the explicit `Mover tela` tool.
- Keep quick card renaming live, undoable, and persisted after `Salvar layout`.
- Keep Oracle strictly read-only. Do not enable live reads, broaden the allowlist, expose credentials, or run write/DDL statements without explicit authorization and review.
- Do not push, publish, or deploy automatically. Leave local changes ready for the owner to review.
- Before handoff, run `npm run typecheck`, `npm test`, and `npm run build`. For UI changes, also run `npm run test:e2e` after installing Chromium with `npx playwright install chromium`.
