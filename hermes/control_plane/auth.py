from fastapi import Header, HTTPException

from .state import CONTROL_TOKEN


async def require_control_token(x_control_token: str | None = Header(default=None)) -> None:
    if not CONTROL_TOKEN:
        raise HTTPException(status_code=500, detail="CONTROL_TOKEN is not set on the server")
    if x_control_token != CONTROL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid or missing X-Control-Token")
