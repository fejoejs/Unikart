from fastapi import APIRouter
from app.api.v1.superadmin import auth, overview, hr, approvals, governance, control_tower

superadmin_router = APIRouter(prefix="/superadmin")

superadmin_router.include_router(auth.router)
superadmin_router.include_router(overview.router)
superadmin_router.include_router(hr.router)
superadmin_router.include_router(approvals.router)
superadmin_router.include_router(governance.router)
superadmin_router.include_router(control_tower.router)

