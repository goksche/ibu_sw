from __future__ import annotations

from datetime import datetime
from pathlib import Path


SCHEMA_FILE = Path("/root/ibu_sw/backend/app/schemas/registration.py")
API_FILE = Path("/root/ibu_sw/backend/app/api/v1/registration.py")


def patch_schema() -> None:
    text = SCHEMA_FILE.read_text(encoding="utf-8")
    backup = SCHEMA_FILE.with_suffix(SCHEMA_FILE.suffix + f".bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup.write_text(text, encoding="utf-8")

    if "last_name: str" in text:
        text = text.replace("last_name: str", "last_name: Optional[str] = None", 1)
    SCHEMA_FILE.write_text(text, encoding="utf-8")
    print(f"Patched schema: {SCHEMA_FILE}")
    print(f"Backup schema:  {backup}")


def patch_api() -> None:
    text = API_FILE.read_text(encoding="utf-8")
    backup = API_FILE.with_suffix(API_FILE.suffix + f".bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup.write_text(text, encoding="utf-8")

    if 'first_name = (data.first_name or "").strip()' not in text:
        marker = '    """Create a registration request and send OTP for email verification."""\n'
        insert = (
            marker
            + '    first_name = (data.first_name or "").strip()\n'
            + '    last_name = (data.last_name or "").strip()\n'
        )
        text = text.replace(marker, insert, 1)

    text = text.replace("first_name=data.first_name,", "first_name=first_name,")
    text = text.replace("last_name=data.last_name,", "last_name=last_name,")
    text = text.replace("existing_request.first_name = data.first_name", "existing_request.first_name = first_name")
    text = text.replace("existing_request.last_name = data.last_name", "existing_request.last_name = last_name")
    text = text.replace("send_registration_otp(data.email, otp_code, data.first_name)", "send_registration_otp(data.email, otp_code, first_name)")

    API_FILE.write_text(text, encoding="utf-8")
    print(f"Patched API: {API_FILE}")
    print(f"Backup API:  {backup}")


if __name__ == "__main__":
    patch_schema()
    patch_api()
