from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from database import get_db
from crud import get_users, create_user, get_user_by_username, get_user_by_id
from schemas import UserCreate, UserOut, UserUpdate
from deps import get_current_active_user, get_current_admin_user
from models import User
from ws_manager import manager

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/", response_model=List[UserOut])
async def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_admin_user)
):
    users = await get_users(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=UserOut)
async def create_new_user(
    user: UserCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_user = await get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return await create_user(db=db, user=user)

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_user = await get_user_by_id(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    if user_update.email:
        db_user.email = user_update.email
    if user_update.username:
        # Check if username is already taken
        existing_user = await get_user_by_username(db, username=user_update.username)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Username already in use")
        db_user.username = user_update.username
    if user_update.full_name:
        db_user.full_name = user_update.full_name
    if user_update.password:
        from security import get_password_hash
        db_user.hashed_password = get_password_hash(user_update.password)
    if user_update.role:
        db_user.role = user_update.role
    if user_update.tailnet_ip is not None:
        db_user.tailnet_ip = user_update.tailnet_ip
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.put("/{user_id}/status", response_model=UserOut)
async def update_user_status(
    user_id: str,
    status_update: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user status and custom status. Users can only update their own status."""
    db_user = await get_user_by_id(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Allow users to update their own status, or admins to update anyone's
    if db_user.id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot update another user's status")
    
    # Validate status values
    valid_statuses = ["online", "away", "dnd", "offline"]
    if "status" in status_update:
        if status_update["status"] not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        db_user.status = status_update["status"]
    
    if "custom_status" in status_update:
        db_user.custom_status = status_update["custom_status"]
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Broadcast status change via WebSocket to all connected users
    await manager.broadcast_status_change(
        user_id=str(db_user.id),
        status=db_user.status,
        custom_status=db_user.custom_status
    )
    
    return db_user

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_user = await get_user_by_id(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await db.delete(db_user)
    await db.commit()
    return {"message": "User deleted successfully"}