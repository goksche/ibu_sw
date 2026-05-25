# App Settings Schemas - Pydantic Models

from typing import List, Literal
from pydantic import BaseModel, Field, field_validator


SlideType = Literal["groups", "qualification", "ko"]


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
    layout: Literal["standard", "neon", "neon_yellow", "neon_cyan", "neon_blue"] = "standard"
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

    @field_validator("layout", mode="before")
    @classmethod
    def normalize_layout(cls, value: str):
        if value in (None, "", "default"):
            return "standard"
        return value

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

