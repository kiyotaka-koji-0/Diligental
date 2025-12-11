from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import shutil
import os
import uuid
from datetime import datetime
from database import get_db
from deps import get_current_user
from models import User, Attachment
from schemas import AttachmentOut

router = APIRouter(tags=["files"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=AttachmentOut)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext in ['.exe', '.sh', '.bat', '.cmd', '.js', '.py', '.php']:
         raise HTTPException(status_code=400, detail="File type not allowed")

    # Create date-based directory
    today = datetime.now()
    date_path = f"{today.year}/{today.month:02d}"
    full_upload_path = os.path.join(UPLOAD_DIR, date_path)
    os.makedirs(full_upload_path, exist_ok=True)

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(full_upload_path, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    
    # Get file size and validate
    file_size = os.path.getsize(file_path)
    if file_size > 10 * 1024 * 1024: # 10MB limit
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Create DB entry
    attachment = Attachment(
        user_id=current_user.id,
        filename=file.filename,
        file_path=f"/static/{date_path}/{unique_filename}", # Public URL path
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size
    )
    
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    
    return attachment
