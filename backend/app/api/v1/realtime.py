import asyncio
import json
import logging
from typing import AsyncGenerator, Set, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Query, status
from starlette.responses import StreamingResponse
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.models.auth import User
from app.api.v1.deps import require_roles

logger = logging.getLogger("realtime")

router = APIRouter(prefix="/realtime", tags=["Realtime Live Events (SSE)"])

# In-memory subscriber connections for Server-Sent Events (SSE)
_subscribers: Set[asyncio.Queue] = set()

async def subscribe_events() -> AsyncGenerator[str, None]:
    """
    Subscribes a client to the live SSE stream.
    Yields events in standard SSE format: data: {...}\n\n
    """
    queue = asyncio.Queue()
    _subscribers.add(queue)
    try:
        # Initial greeting event
        init_event = json.dumps({"event": "connected", "message": "Connected to Unikart Live Event Stream"})
        yield f"data: {init_event}\n\n"

        while True:
            try:
                # Wait for next broadcast event with 15s timeout for heartbeat
                data = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {data}\n\n"
            except asyncio.TimeoutError:
                # Keep-alive heartbeat ping to prevent proxy/browser timeout
                yield ": ping\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        _subscribers.discard(queue)

def broadcast_live_event(event_type: str, payload: dict):
    """
    Broadcasts an event to all connected clients (Storefront, Inventory, Admin)
    with zero polling overhead.
    """
    if not _subscribers:
        return

    message = json.dumps({"event": event_type, "data": payload})
    for queue in list(_subscribers):
        try:
            queue.put_nowait(message)
        except Exception as e:
            logger.warning(f"Failed to push SSE message to subscriber: {e}")

def broadcast_stock_change(variant_id: int, sku: str, product_name: str, on_hand: int, available: int, reason: str):
    """
    Triggers an instant stock change broadcast across all applications.
    """
    broadcast_live_event("stock_updated", {
        "variant_id": variant_id,
        "sku": sku,
        "product_name": product_name,
        "on_hand": on_hand,
        "available": available,
        "reason": reason
    })

def broadcast_order_created(order_number: str, channel: str, total_amount_paise: int, items_count: int):
    """
    Triggers an instant order notification for Admin and Manager dashboards.
    Broadcasts both 'order_created' and 'order_placed' for universal subscriber compatibility.
    """
    event_data = {
        "order_number": order_number,
        "channel": channel,
        "total_amount_paise": total_amount_paise,
        "items_count": items_count
    }
    broadcast_live_event("order_created", event_data)
    broadcast_live_event("order_placed", event_data)

@router.get("/events")
async def live_events_stream(
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events (SSE) endpoint for staff & operational dashboards.
    Browsers connect via EventSource('/api/v1/realtime/events?token=...').
    """
    # Verify token if present (or allow internal dev/same-origin staff sessions)
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
                if not user:
                    raise HTTPException(status_code=401, detail="Invalid token for live stream.")
        except JWTError:
            raise HTTPException(status_code=401, detail="Could not validate stream credentials.")

    return StreamingResponse(
        subscribe_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/broadcast-test", dependencies=[Depends(require_roles(["admin", "owner"]))])
async def broadcast_test_event(event_type: str = "test", message: str = "Live broadcast test"):
    """
    Protected diagnostic endpoint to verify real-time SSE stream delivery.
    Requires admin or owner privileges.
    """
    broadcast_live_event(event_type, {"message": message, "active_subscribers": len(_subscribers)})
    return {"success": True, "active_subscribers": len(_subscribers)}
