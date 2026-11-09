import os
import io
import uuid
import logging
from typing import Optional, Dict, Any
import httpx
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

async def upload_product_image_to_storage(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    product_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Uploads a product image directly to Supabase Storage.
    Falls back gracefully to local static storage if Supabase credentials are not yet configured.
    """
    supabase_url = settings.SUPABASE_URL
    # Prefer service role key for backend storage uploads; fallback to anon key if service key not provided
    supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    bucket_name = settings.SUPABASE_STORAGE_BUCKET or "product-images"

    # Canonical storage path inside the bucket: products/{product_id}/{filename} or products/{filename}
    if product_id:
        object_path = f"products/{product_id}/{filename}"
    else:
        object_path = f"products/{filename}"

    if supabase_url and supabase_key:
        clean_url = supabase_url.rstrip("/")
        upload_endpoint = f"{clean_url}/storage/v1/object/{bucket_name}/{object_path}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": content_type,
            "x-upsert": "true"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(upload_endpoint, content=file_bytes, headers=headers)
                
                # If bucket doesn't exist yet, attempt to create it
                if res.status_code in (400, 404) and "bucket" in res.text.lower():
                    logger.info(f"Storage bucket '{bucket_name}' not found. Attempting to create it...")
                    create_bucket_res = await client.post(
                        f"{clean_url}/storage/v1/bucket",
                        json={"id": bucket_name, "name": bucket_name, "public": True},
                        headers={"Authorization": f"Bearer {supabase_key}", "Content-Type": "application/json"}
                    )
                    if create_bucket_res.status_code in (200, 201):
                        logger.info(f"Storage bucket '{bucket_name}' created successfully.")
                        # Retry upload
                        res = await client.post(upload_endpoint, content=file_bytes, headers=headers)

                if res.status_code in (200, 201):
                    public_url = f"{clean_url}/storage/v1/object/public/{bucket_name}/{object_path}"
                    logger.info(f"Image uploaded to Supabase Storage: {public_url}")
                    return {
                        "url": public_url,
                        "path": object_path,
                        "bucket": bucket_name,
                        "storage": "supabase",
                        "message": "Image uploaded successfully to Supabase Storage."
                    }
                else:
                    logger.warning(f"Supabase Storage upload returned status {res.status_code}: {res.text}. Falling back to local storage.")
        except Exception as e:
            logger.warning(f"Supabase Storage upload exception: {e}. Falling back to local storage.")

    # In production, do not silently write to a local ephemeral filesystem
    if settings.ENVIRONMENT.lower() == "production":
        logger.error("Supabase Storage upload failed in production. Refusing localhost fallback.")
        raise HTTPException(
            status_code=502,
            detail="Cloud image storage is unavailable. Please verify SUPABASE_SERVICE_ROLE_KEY and storage bucket permissions."
        )

    # Graceful fallback for local development: local filesystem
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    static_uploads_dir = os.path.join(backend_dir, "static", "uploads")
    os.makedirs(static_uploads_dir, exist_ok=True)
    file_path = os.path.join(static_uploads_dir, filename)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    backend_url = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000").rstrip("/")
    local_url = f"{backend_url}/static/uploads/{filename}"
    return {
        "url": local_url,
        "relative_url": f"/static/uploads/{filename}",
        "path": filename,
        "storage": "local_fallback",
        "message": "Image saved locally (Configure SUPABASE_SERVICE_ROLE_KEY to save directly to Supabase Storage)."
    }
