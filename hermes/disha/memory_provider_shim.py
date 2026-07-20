"""Seeded verbatim to $HERMES_HOME/plugins/disha-students/__init__.py by
control_plane/persona.py — this is the MemoryProvider that hermes's own
plugins/memory/__init__.py discovers via a text scan of __init__.py for
"MemoryProvider"/"register_memory_provider" (see that module's
_is_memory_provider_dir()), so this file has to physically live under
$HERMES_HOME/plugins/<name>/, not just be importable from there. The
real implementation lives in disha/memory_provider.py; this is a thin
shim so the actual logic stays in one place, versioned normally.
"""
from disha.memory_provider import DishaStudentMemory


def register(ctx) -> None:
    ctx.register_memory_provider(DishaStudentMemory())
