import os
import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Query

from app.config import settings
from app.document.download import get_file_content
from app.models import FileModel, ResultModel
from app.llm import analyze_report
from app.storage import s3_client, FILES_TABLE, SUMMARY_TABLE

router = APIRouter(prefix="/document", tags=["Documents"])

ALLOWED_EXTENSIONS = {".txt", ".pdf"}


def _allowed_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS


@router.post("/upload", response_model=FileModel, summary="Upload a TXT or PDF report")
async def upload_file(
    file: UploadFile = File(...), username: str = Query(default="anonymous")
):
    if not _allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are allowed")
    try:
        file_uuid = str(uuid.uuid4())
        s3_client.upload_fileobj(
            file.file,
            settings.S3_BUCKET,
            file.filename,
            ExtraArgs={
                "Metadata": {
                    "uuid": file_uuid,
                    "uploader": username,
                    "filename": file.filename,
                },
                "ContentType": file.content_type,
            },
        )
        record = FileModel(
            uuid=file_uuid,
            filename=file.filename,
            uploaded_at=datetime.now().isoformat(),
            uploader=username,
            status="uploaded",
            content_type=file.content_type,
        )
        FILES_TABLE.put_item(Item=record.model_dump())
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[FileModel], summary="List all uploaded documents")
async def list_files():
    try:
        items = FILES_TABLE.scan().get("Items", [])
        return [FileModel(**item) for item in items]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process", summary="MinIO webhook — triggers OpenAI analysis on upload")
async def process_document(request: Request):
    payload = await request.json()
    try:
        record = payload["Records"][0]
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        metadata = record["s3"]["object"]["userMetadata"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid MinIO event payload")

    try:
        file_content = get_file_content(bucket, key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file from storage: {e}")

    try:
        analysis = analyze_report(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude analysis failed: {e}")

    doc_uuid = metadata.get("X-Amz-Meta-Uuid")
    doc_filename = metadata.get("X-Amz-Meta-Filename")
    if not doc_uuid:
        raise HTTPException(status_code=400, detail="UUID missing from object metadata")

    result = ResultModel(
        uuid=doc_uuid,
        filename=doc_filename,
        summary=analysis.get("summary", ""),
        conditions=analysis.get("conditions", []),
        severity=analysis.get("severity", ""),
        processed_at=datetime.now().isoformat(),
    )

    try:
        SUMMARY_TABLE.put_item(Item=result.model_dump())
        FILES_TABLE.update_item(
            Key={"uuid": doc_uuid},
            UpdateExpression="SET #s = :s, processed_at = :t",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": "processed", ":t": result.processed_at},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist results: {e}")

    return result


@router.get("/result", response_model=ResultModel, summary="Fetch analysis result by UUID")
async def get_result(uuid: str = Query(..., description="Document UUID")):
    try:
        item = SUMMARY_TABLE.get_item(Key={"uuid": uuid}).get("Item")
        if not item:
            raise HTTPException(status_code=404, detail=f"No result found for uuid: {uuid}")
        return ResultModel(**item)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
