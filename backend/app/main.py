from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.storage import s3_client, dynamodb
from app.routers import user, document


def _ensure_dynamodb_tables():
    """Create DynamoDB tables if they don't already exist."""
    table_definitions = [
        {
            "name": "users",
            "key_schema": [{"AttributeName": "username", "KeyType": "HASH"}],
            "attribute_definitions": [{"AttributeName": "username", "AttributeType": "S"}],
        },
        {
            "name": "file",
            "key_schema": [{"AttributeName": "uuid", "KeyType": "HASH"}],
            "attribute_definitions": [{"AttributeName": "uuid", "AttributeType": "S"}],
        },
        {
            "name": "document_results",
            "key_schema": [{"AttributeName": "uuid", "KeyType": "HASH"}],
            "attribute_definitions": [{"AttributeName": "uuid", "AttributeType": "S"}],
        },
    ]
    existing = {t.name for t in dynamodb.tables.all()}
    for tbl in table_definitions:
        if tbl["name"] not in existing:
            dynamodb.create_table(
                TableName=tbl["name"],
                KeySchema=tbl["key_schema"],
                AttributeDefinitions=tbl["attribute_definitions"],
                ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure S3 bucket exists
    existing_buckets = [b["Name"] for b in s3_client.list_buckets().get("Buckets", [])]
    if settings.S3_BUCKET not in existing_buckets:
        s3_client.create_bucket(Bucket=settings.S3_BUCKET)

    # Ensure DynamoDB tables exist
    _ensure_dynamodb_tables()

    yield


app = FastAPI(
    title="Clinical NLP Platform API",
    description=(
        "Upload clinical reports (TXT/PDF), automatically extract medical conditions, "
        "severity, and summaries using OpenAI. Results are stored in DynamoDB."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(document.router)
