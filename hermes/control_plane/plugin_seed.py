"""Seeds our plugins and gateway hooks onto the data volume.

Unlike SOUL.md (persona.py — seeded once, then operator-owned), all of
this is OUR code, not something an operator customizes in place. It's
overwritten on every boot so a rebuilt image always ships its current
version — there's nothing here for a "never touch a customized file"
rule to protect.

Why file copies at all, rather than just living in hermes/disha/ and
being imported normally: hermes's plugin/hook discovery only looks in
fixed, hermes-owned locations relative to $HERMES_HOME — the memory
provider at plugins/<name>/ (flat, no "memory/" subfolder — see
disha/memory_provider_shim.py's docstring), the generic plugin at the
same plugins/<name>/ convention (disha/seed/plugins/disha-events/),
and the gateway hook at hooks/<name>/ (disha/seed/hooks/disha-crm/).
"""
from __future__ import annotations

import shutil
from pathlib import Path

from .state import HERMES_HOME

_DISHA_DIR = Path(__file__).resolve().parent.parent / "disha"
_MEMORY_SHIM_SOURCE = _DISHA_DIR / "memory_provider_shim.py"
_SEED_DIR = _DISHA_DIR / "seed"


def _copy_tree(src: Path, dst: Path) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if item.is_dir():
            _copy_tree(item, dst / item.name)
        else:
            shutil.copy2(item, dst / item.name)


def seed_memory_provider() -> None:
    target_dir = HERMES_HOME / "plugins" / "disha-students"
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / "__init__.py").write_text(_MEMORY_SHIM_SOURCE.read_text())


def seed_events_plugin() -> None:
    _copy_tree(_SEED_DIR / "plugins" / "disha-events", HERMES_HOME / "plugins" / "disha-events")


def seed_crm_hook() -> None:
    _copy_tree(_SEED_DIR / "hooks" / "disha-crm", HERMES_HOME / "hooks" / "disha-crm")


def seed_all() -> None:
    seed_memory_provider()
    seed_events_plugin()
    seed_crm_hook()
