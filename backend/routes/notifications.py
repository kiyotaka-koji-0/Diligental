from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid
import crud, schemas, database
from deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[schemas.Notification])
async def read_notifications(
    skip: int = 0,
    limit: int = 50,
    current_user: schemas.UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.get_notifications(db, user_id=current_user.id, skip=skip, limit=limit)

@router.post("/{notification_id}/read", response_model=schemas.Notification)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: schemas.UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    notif = await crud.mark_notification_read(db, notification_id, current_user.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif
