from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from app.core.security import decode_token

class AuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")
        request.state.user = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = decode_token(token)
                request.state.user = payload
            except Exception:
                pass
        return await call_next(request)
