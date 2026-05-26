from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CloudPilot Backend"
    environment: str = "development"
    api_prefix: str = "/api"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 60 * 24 * 7
    database_url: str = "postgresql+psycopg://postgres:postgres@postgres:5432/appdb"
    redis_url: str = "redis://redis:6379/0"
    # Stored as plain string to avoid pydantic-settings v2 JSON pre-parsing
    # Use cors_origins_list property for the actual list
    cors_origins: str = "http://localhost:8080,http://localhost:5173"
    rate_limit: str = "100/minute"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str | None = None
    refresh_cookie_name: str = "cloudpilot_refresh"
    csrf_cookie_name: str = "csrf_token"
    csrf_header_name: str = "X-CSRF-Token"

    # Deployment engine settings
    build_dir: str = "/tmp/cloudpilot_builds"
    traefik_domain: str = "localhost"
    public_base_url: str = "http://localhost"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse the comma-separated cors_origins string into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Ensure psycopg v3 driver is used — convert postgresql:// → postgresql+psycopg://"""
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
