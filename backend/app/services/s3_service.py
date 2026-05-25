"""S3-compatible storage for avatar uploads. Falls back to local disk if S3 is not configured."""
import os
import io
from typing import Optional
from app.core.config import settings

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    if not settings.S3_ENDPOINT or not settings.S3_ACCESS_KEY or not settings.S3_SECRET_KEY:
        return None
    try:
        import boto3
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )
        return _s3_client
    except Exception as e:
        print(f"S3 client init failed: {e}")
        return None


def _resize_image(data: bytes, size: int = 200) -> bytes:
    """Resize and crop image to square. Returns JPEG bytes."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")

        w, h = img.size
        short = min(w, h)
        left = (w - short) // 2
        top = (h - short) // 2
        img = img.crop((left, top, left + short, top + short))
        img = img.resize((size, size), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except ImportError:
        return data


def upload_avatar(user_id: int, file_data: bytes, content_type: str) -> Optional[str]:
    """Upload avatar image. Returns the public URL or local path."""
    resized = _resize_image(file_data, settings.AVATAR_DIMENSION)
    key = f"avatars/{user_id}.jpg"

    client = _get_s3_client()
    if client:
        try:
            client.put_object(
                Bucket=settings.S3_BUCKET,
                Key=key,
                Body=resized,
                ContentType="image/jpeg",
            )
            url = f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET}/{key}"
            return url
        except Exception as e:
            print(f"S3 upload failed: {e}")
            return None

    # Fallback: local storage
    local_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, f"{user_id}.jpg")
    with open(local_path, "wb") as f:
        f.write(resized)
    return f"/uploads/avatars/{user_id}.jpg"


def delete_avatar(user_id: int, current_url: Optional[str] = None) -> bool:
    key = f"avatars/{user_id}.jpg"

    client = _get_s3_client()
    if client:
        try:
            client.delete_object(Bucket=settings.S3_BUCKET, Key=key)
            return True
        except Exception as e:
            print(f"S3 delete failed: {e}")
            return False

    # Fallback: local
    local_path = os.path.join(settings.UPLOAD_DIR, "avatars", f"{user_id}.jpg")
    if os.path.exists(local_path):
        os.remove(local_path)
    return True
