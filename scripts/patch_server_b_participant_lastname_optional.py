from __future__ import annotations

from datetime import datetime
from pathlib import Path


TARGET = Path("/root/ibu_sw/backend/app/schemas/participant.py")


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak_lastnameopt_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup.write_text(text, encoding="utf-8")

    text = text.replace(
        "last_name: str = Field(..., min_length=1, max_length=100)",
        'last_name: str = Field(default="", max_length=100)',
    )
    text = text.replace(
        "last_name: str | None = Field(default=None, min_length=1, max_length=100)",
        "last_name: str | None = Field(default=None, max_length=100)",
    )

    if "@field_validator('first_name')" not in text:
        marker = """        except EmailNotValidError:
            raise ValueError('Invalid email format')
"""
        addition = marker + """
    @field_validator('first_name')
    @classmethod
    def validate_first_name(cls, v: str) -> str:
        value = (v or '').strip()
        if not value:
            raise ValueError('First name is required')
        return value

    @field_validator('last_name')
    @classmethod
    def normalize_last_name(cls, v: str | None) -> str:
        return (v or '').strip()
"""
        text = text.replace(marker, addition, 1)

    TARGET.write_text(text, encoding="utf-8")
    print(f"Patched: {TARGET}")
    print(f"Backup:  {backup}")


if __name__ == "__main__":
    main()
