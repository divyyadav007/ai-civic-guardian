from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "AI Civic Guardian"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./civic_guardian.db"
    SYNC_DATABASE_URL: str = "sqlite:///./civic_guardian.db"

    # S3 / MinIO Object Storage
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_PUBLIC_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "civic-guardian"

    # Security & JWT
    JWT_SECRET_KEY: str = "dev_insecure_jwt_secret_key_civic_guardian_32chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # AI / ML Service Configuration
    CLASSIFICATION_PROVIDER: str = "mobilenet"  # mobilenet | resnet | mock
    CLASSIFICATION_CONFIDENCE_THRESHOLD: float = 0.60
    GEOCODING_PROVIDER: str = "nominatim"  # nominatim | google | mock
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    STT_PROVIDER: str = "whisper"  # whisper | google | mock
    WHISPER_MODEL_SIZE: str = "tiny"  # tiny | base | small
    DEV_OTP_CODE: str = "123456"  # Mock OTP for local dev/testing


settings = Settings()
