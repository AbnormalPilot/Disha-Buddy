# Upstream

- Repo: https://github.com/NousResearch/hermes-agent
- Vendored tag: `v2026.7.7.2`
- Vendored commit: `9de9c25f620ff7f1ce0fd5457d596052d5159596`
- Vendored on: 2026-07-20
- Fetch method: `git clone --depth 1 --branch v2026.7.7.2`, then `.git` stripped and tree committed directly into `hermes/` in this repo.

## Re-vendoring / upstream merge

This tree is committed as plain files (no submodule, no upstream git history) to keep the product repo self-contained per the Docker-first operator experience. To pull a newer upstream release:

1. Clone the new tag elsewhere, diff it against this `UPSTREAM.md`'s commit to see what changed upstream.
2. Re-apply every edit logged in `CUSTOMIZATIONS.md` to the new tree, file by file.
3. Update the tag/commit/date above.

Keep `CUSTOMIZATIONS.md` accurate as edits are made — it is the map for step 2.
