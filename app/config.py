"""Application configuration.

Settings are read from environment variables (and a local `.env` file in dev).
Import the shared `settings` instance everywhere — do not read os.environ directly.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    app_name: str = "Enpal Home Energy API"
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # --- AI layer (chatbot) ---
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"

    # --- External data (forecast) ---
    weather_api_key: str = ""
    weather_api_base_url: str = "https://api.open-meteo.com/v1"

    # --- Dataset ---
    # Folder (relative to repo root, or absolute) holding the synthetic JSON dataset.
    dataset_dir: str = "enpal dataset"
    # Reference per-kWh grid rate for a "no solar/battery, standard tariff" baseline.
    # Savings are measured against this counterfactual.
    baseline_grid_rate_eur_per_kwh: float = 0.349

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS origins as a clean list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor (instantiated once per process)."""
    return Settings()


settings = get_settings()
