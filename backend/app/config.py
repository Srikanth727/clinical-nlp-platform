import os


class Settings:
    # S3 (MinIO) config
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "uploads")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "minio")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "minio123")

    # DynamoDB config
    DYNAMODB_ENDPOINT: str = os.getenv("DYNAMODB_ENDPOINT", "http://localhost:8000")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "dummy")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "dummy")
    DYNAMODB_REGION: str = "us-east-1"

    # CORS — comma-separated list of allowed origins
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")


settings = Settings()
