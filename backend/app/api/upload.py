import os, shutil, tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ingestion import ingest_file
from app.models.schemas import DocumentInfo

router = APIRouter()
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md"}

@router.post("/upload/{session_id}", response_model=DocumentInfo)
async def upload_document(session_id: str, file: UploadFile = File(...)):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type .{ext} not supported. Use PDF, DOCX, or TXT.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = ingest_file(tmp_path, file.filename, session_id)
    finally:
        os.unlink(tmp_path)

    return DocumentInfo(
        id=session_id,
        filename=result["filename"],
        chunks=result["chunks"],
        uploaded_at=result["uploaded_at"],
    )