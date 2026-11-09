from fastapi import FastAPI, Request, status, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all ORM models are registered
import os
import time
import datetime
from sqlalchemy import text
from app.api.v1 import auth, catalog, cart, checkout, orders, admin, realtime, enterprise, newsletter
from app.api.v1.superadmin.router import superadmin_router

SERVER_START_TIME = datetime.datetime.now(datetime.timezone.utc)


# Automatically create/verify database tables on startup
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    # Safe fallback if database is offline during build/inspection
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="UNIKART 2-Application Shared API Engine (Customer E-Commerce & Inventory Management)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Static Files for Uploaded Product Images
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static"
)

# CORS Middleware for all applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(settings.CORS_ORIGINS + [
        "http://localhost:5173",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5177",
        "https://unikart.vercel.app",
        "https://unikart-in.vercel.app",
        "https://unikart-storefront.vercel.app",
        "https://unikart-inventory.vercel.app"
    ])),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Safe Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None)
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again."}
    )

# Health checks with real server uptime and database latency diagnostics (supports GET and HEAD for UptimeRobot)
@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route(f"{settings.API_V1_STR}/health", methods=["GET", "HEAD"])
@app.api_route("/", methods=["GET", "HEAD"])
def health_check():
    now = datetime.datetime.now(datetime.timezone.utc)
    uptime_seconds = int((now - SERVER_START_TIME).total_seconds())

    db_ok = True
    db_latency_ms = 0.0
    try:
        from app.core.database import SessionLocal
        t0 = time.time()
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception as e:
        db_ok = False
        db_latency_ms = -1.0

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": "production-ready",
        "currency": settings.CURRENCY,
        "gstin": settings.STORE_GSTIN,
        "uptime_seconds": uptime_seconds,
        "database": {
            "status": "connected" if db_ok else "disconnected",
            "latency_ms": db_latency_ms
        }
    }

# Register API v1 routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(catalog.router, prefix=settings.API_V1_STR)
app.include_router(cart.router, prefix=settings.API_V1_STR)
app.include_router(checkout.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(realtime.router, prefix=settings.API_V1_STR)
app.include_router(newsletter.router, prefix=settings.API_V1_STR)
app.include_router(superadmin_router, prefix=settings.API_V1_STR)
app.include_router(enterprise.router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
