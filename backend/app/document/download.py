import io

import pdfplumber

from app.storage import s3_client


def get_file_content(bucket: str, key: str) -> str:
    """Download a file from S3/MinIO and return its text content."""
    response = s3_client.get_object(Bucket=bucket, Key=key)
    body = response["Body"].read()

    if key.lower().endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(body)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)

    return body.decode("utf-8")
