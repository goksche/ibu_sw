# App Settings Schemas - Pydantic Models

from typing import Any, List, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


SlideType = Literal["groups", "qualification", "ko"]

# Legacy theme ids (ältere Deploys / bodyLayout) → aktuelle layout-Werte
_LAYOUT_ALIASES: dict[str, str] = {
    "design_1_0": "standard",
    "design1.0": "standard",
    "design_2_0": "arena",
    "design2.0": "arena",
    "arena_minimal_premium": "arena",
    "design_3_0": "gsmartsol",
    "design3.0": "gsmartsol",
    "gsmartsol_design": "gsmartsol",
    "brand": "gsmartsol",
    "fresh": "neon",
    "fresh_yellow": "neon_yellow",
    "fresh_dark": "arena",
    "fresh_black": "gsmartsol",
}


def _normalize_layout_value(value: Any) -> Any:
    if value in (None, "", "default"):
        return "standard"
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in _LAYOUT_ALIASES:
            return _LAYOUT_ALIASES[normalized]
    return value


def _merge_body_layout_key(data: dict) -> dict:
    """Ältere APIs nutzten bodyLayout statt layout; Werte zusammenführen."""
    out = dict(data)
    if out.get("bodyLayout") is not None:
        if out.get("layout") in (None, ""):
            out["layout"] = out["bodyLayout"]
        out.pop("bodyLayout", None)
    return out


class SlidesEnabled(BaseModel):
    groups: bool = True
    qualification: bool = True
    ko: bool = True


class LiveTickerSettings(BaseModel):
    slide_duration_sec: int = Field(20, ge=5, le=60)
    refresh_interval_sec: int = Field(20, ge=10, le=120)
    slide_order: List[SlideType] = Field(default_factory=lambda: ["groups", "qualification", "ko"])
    slides_enabled: SlidesEnabled = SlidesEnabled()
    only_running_group_matches: bool = False
    show_spielfeld: bool = True
    show_results: bool = True
    mark_decision_matches: bool = True
    max_groups_per_slide: int = Field(1, ge=1, le=2)

    @field_validator("slide_order")
    @classmethod
    def validate_slide_order(cls, value: List[SlideType]):
        allowed = {"groups", "qualification", "ko"}
        if any(item not in allowed for item in value):
            raise ValueError("Invalid slide_order entry")
        if len(set(value)) != len(value):
            raise ValueError("slide_order must not contain duplicates")
        return value


class DashboardSettings(BaseModel):
    default_sort: Literal["date", "name", "status"] = "date"


class PlaceholderSettings(BaseModel):
    language: str = "de-CH"
    timezone: str = "Europe/Zurich"
    layout: Literal["standard", "neon", "neon_yellow", "neon_cyan", "neon_blue", "arena", "gsmartsol"] = "standard"
    font_family: Literal[
        "Protest Guerilla",
        "Source Sans 3",
        "Helvetica",
        "Baskerville",
        "Times",
        "Gotham",
        "Bodoni",
        "Didot",
        "Rockwell",
        "Franklin",
        "Sabon",
        "News Gothic",
        "Elliot Six",
        "Angelina",
        "Mushroom 6",
        "Rocksmith",
        "The Doorman",
        "Rampstar",
    ] = "Source Sans 3"

    @model_validator(mode="before")
    @classmethod
    def _legacy_body_layout_placeholder(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return _merge_body_layout_key(data)
        return data

    @field_validator("layout", mode="before")
    @classmethod
    def normalize_layout(cls, value: str):
        return _normalize_layout_value(value)

    @field_validator("font_family", mode="before")
    @classmethod
    def normalize_font_family(cls, value: str):
        if value in (None, "", "default"):
            return "Source Sans 3"
        return value


class AppSettingsPayload(BaseModel):
    live_ticker: LiveTickerSettings = LiveTickerSettings()
    dashboard: DashboardSettings = DashboardSettings()
    placeholders: PlaceholderSettings = PlaceholderSettings()


class UserSettingsPayload(BaseModel):
    """Per-user settings – subset of global settings that each user can customize."""

    model_config = ConfigDict(extra="ignore")

    layout: Literal["standard", "neon", "neon_yellow", "neon_cyan", "neon_blue", "arena", "gsmartsol"] = "standard"
    font_family: Literal[
        "Protest Guerilla",
        "Source Sans 3",
        "Helvetica",
        "Baskerville",
        "Times",
        "Gotham",
        "Bodoni",
        "Didot",
        "Rockwell",
        "Franklin",
        "Sabon",
        "News Gothic",
        "Elliot Six",
        "Angelina",
        "Mushroom 6",
        "Rocksmith",
        "The Doorman",
        "Rampstar",
    ] = "Source Sans 3"
    dashboard_sort: Literal["date", "name", "status"] = "date"
    language: str = "de-CH"
    timezone: str = "Europe/Zurich"

    @model_validator(mode="before")
    @classmethod
    def _legacy_body_layout_user(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return _merge_body_layout_key(data)
        return data

    @field_validator("layout", mode="before")
    @classmethod
    def normalize_layout(cls, value):
        return _normalize_layout_value(value)

    @field_validator("font_family", mode="before")
    @classmethod
    def normalize_font(cls, value):
        if value in (None, "", "default"):
            return "Source Sans 3"
        return value

