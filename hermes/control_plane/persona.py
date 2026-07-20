"""Seeds our persona/mission files into HERMES_HOME.

SOUL.md (the identity slot Hermes actually loads, see
website/docs/user-guide/configuration.md and hermes_cli/config.py's
seed_default_soul()) is written ONCE, on first boot only — matching
upstream's own "never touch a file the operator has customized"
semantics for that file. We don't want to fight that by overwriting it
on every restart.

AGENTS.md (our mission + safety rails, auto-discovered by Hermes's
project-context-file mechanism — see agent/prompt_builder.py) is
regenerated on every /config save, because it's the one place the
wizard's "extra instructions" field (persona review step) needs to
land. Regenerating from the same template + current extra text is
idempotent — no accumulating duplicate sections.
"""
from __future__ import annotations

from pathlib import Path

from .state import HERMES_HOME

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "disha" / "prompts"
_BASE_AGENTS_MD = (_PROMPTS_DIR / "AGENTS.md").read_text()
_BASE_SOUL_MD = (_PROMPTS_DIR / "SOUL.md").read_text()

_EXTRA_HEADING = "\n\n## Operator additions\n\n"


def seed_soul_if_absent() -> None:
    soul_path = HERMES_HOME / "SOUL.md"
    if not soul_path.exists():
        soul_path.write_text(_BASE_SOUL_MD)


def write_agents_md(extra_instructions: str | None) -> None:
    content = _BASE_AGENTS_MD
    if extra_instructions and extra_instructions.strip():
        content += _EXTRA_HEADING + extra_instructions.strip() + "\n"
    (HERMES_HOME / "AGENTS.md").write_text(content)


def base_soul_md() -> str:
    return _BASE_SOUL_MD


def base_agents_md() -> str:
    return _BASE_AGENTS_MD
