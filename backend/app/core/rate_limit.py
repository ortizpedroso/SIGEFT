from collections import defaultdict
from time import time

from fastapi import HTTPException, Request, status

_hits: dict[str, list[float]] = defaultdict(list)


def rate_limit_login(request: Request, max_hits: int = 8, window_seconds: int = 60) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time()
    recent = [t for t in _hits[ip] if now - t < window_seconds]
    if len(recent) >= max_hits:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Aguarde um minuto e tente novamente.",
        )
    recent.append(now)
    _hits[ip] = recent
