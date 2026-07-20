# Customizations to vendored Hermes core

Every edit to an **upstream** file (anything outside `hermes/disha/` and
`hermes/control_plane/`) must be logged here: path, what changed, why.
New files that live entirely under `disha/` or `control_plane/` don't need
an entry — they're additive and don't affect upstream mergeability.

Format per entry:

```
### <upstream file path>
- What: <one-line diff summary>
- Why: <reason, link to HANDOVER.md section if applicable>
```

---

### Dockerfile
- What: `FROM debian:13.4` → `FROM debian:13.4 AS hermes_base` (one line). A new `FROM hermes_base AS disha` stage is appended at the end of the same file, which becomes the image's default build target since it's the last stage.
- Why: Lets us install `disha/` + `control_plane/` and override one s6 run script (see below) as an additive final layer, without forking the whole Dockerfile or duplicating the upstream build steps. Everything above the appended stage is byte-for-byte upstream. §5 of HANDOVER.md ("extends upstream Dockerfile, don't rewrite").

### docker/s6-rc.d/main-hermes/run
- What: Not edited on disk. Overridden via `COPY --chmod=0755 disha/docker/main-hermes-run /etc/s6-overlay/s6-rc.d/main-hermes/run` in the `disha` Dockerfile stage, replacing the upstream placeholder (`exec sleep infinity`, explicitly reserved by an upstream comment for "a future long-lived hermes process") with our control-plane's uvicorn process.
- Why: `main-hermes` is the only s6 service slot upstream ships that's meant for exactly this. Using a COPY overlay instead of editing the vendored file keeps the vendored tree unmodified on disk, so a future `git diff` against a re-vendored upstream release shows zero changes to this file — the override lives entirely in our build layer. §4 of HANDOVER.md (control plane process model).
