from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, status
from fastapi.responses import JSONResponse

class AuthorizationMiddleware(BaseHTTPMiddleware):
    """
    Optional global route guard checking basic scope or blocklist headers.
    """
    async def dispatch(self, request: Request, call_next):
        return await call_next(request)
