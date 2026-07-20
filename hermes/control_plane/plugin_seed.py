"""Seeds our memory-provider plugin onto the data volume.

Unlike SOUL.md (persona.py — seeded once, then operator-owned), this is
OUR code, not something an operator customizes in place. It's
overwritten on every boot so a rebuilt image always ships its current
version — there's nothing here for a "never touch a customized file"
rule to protect.

Why this has to be a file copy at all, rather than just living in
hermes/disha/ and being imported normally: hermes's memory-provider
discovery (plugins/memory/__init__.py) only looks in two places —
plugins/memory/<name>/ (bundled, upstream-owned) and
$HERMES_HOME/plugins/<name>/ (user-installed, flat, no "memory/"
subfolder). See disha/memory_provider_shim.py's docstring for the full
reasoning.
"""
from __future__ import annotations

from pathlib import Path

from .state import HERMES_HOME

_SHIM_SOURCE = Path(__file__).resolve().parent.parent / "disha" / "memory_provider_shim.py"
_PLUGIN_DIR_NAME = "disha-students"


def seed_memory_provider() -> None:
    target_dir = HERMES_HOME / "plugins" / _PLUGIN_DIR_NAME
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / "__init__.py").write_text(_SHIM_SOURCE.read_text())
