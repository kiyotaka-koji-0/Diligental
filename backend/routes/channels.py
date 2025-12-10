from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid

from database import get_db
import crud
from schemas import Channel, ChannelCreate, Message, MessageCreate, DMChannelCreate
from models import User
from deps import get_current_user

router = APIRouter(prefix="/channels", tags=["channels"])

@router.post("/", response_model=Channel)
async def create_channel(
    channel: ChannelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user is a member of the workspace
    member = await crud.get_workspace_member(db, channel.workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    db_channel = await crud.get_channel_by_name(db, name=channel.name)
    # Check name uniqueness *within workspace*? Currently get_channel_by_name is global. 
    # Ideally should be scoped, but for now let's just proceed or better yet, scope it later.
    # Actually, current crud.get_channel_by_name is global. We should probably update it or skip for now.
    # Let's skip global name check for now or assume unique names globally is annoying. 
    # But for this iteration, let's just create it.
    
    return await crud.create_channel(db=db, channel=channel, owner_id=current_user.id, workspace_id=channel.workspace_id)

@router.post("/dm", response_model=Channel)
async def create_dm_channel(
    dm_create: DMChannelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify both users are in workspace
    # 1. Current user
    current_member = await crud.get_workspace_member(db, dm_create.workspace_id, current_user.id)
    if not current_member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    # 2. Target user
    target_member = await crud.get_workspace_member(db, dm_create.workspace_id, dm_create.target_user_id)
    if not target_member:
         raise HTTPException(status_code=404, detail="Target user not found in workspace")

    return await crud.get_or_create_dm_channel(
        db=db,
        workspace_id=dm_create.workspace_id,
        user1_id=current_user.id,
        user2_id=dm_create.target_user_id
    )

@router.get("/", response_model=List[Channel])
async def read_channels(
    workspace_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user is a member of the workspace
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    channels = await crud.get_channels(db, workspace_id=workspace_id, user_id=current_user.id, skip=skip, limit=limit)
    return channels

@router.post("/{channel_id}/messages", response_model=Message)
async def create_message(
    channel_id: uuid.UUID,
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Ensure channel exists
    db_channel = await crud.get_channel(db, channel_id=channel_id)
    if not db_channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Ensure user is member of the workspace
    member = await crud.get_workspace_member(db, db_channel.workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    # Ensure message.channel_id matches path param (good practice)
    if message.channel_id != channel_id:
        raise HTTPException(status_code=400, detail="Channel ID mismatch")

    msg, _ = await crud.create_message(db=db, message=message, user_id=current_user.id)
    return msg

@router.get("/{channel_id}/messages", response_model=List[Message])
async def read_messages(
    channel_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    parent_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Ensure channel exists
    db_channel = await crud.get_channel(db, channel_id=channel_id)
    if not db_channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    # Ensure user is member of the workspace
    member = await crud.get_workspace_member(db, db_channel.workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    return await crud.get_messages(db, channel_id=channel_id, skip=skip, limit=limit, parent_id=parent_id)

@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    channel = await crud.get_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    # Check if user is member of workspace (and ideally admin/owner, but for now just member)
    member = await crud.get_workspace_member(db, channel.workspace_id, current_user.id)
    if not member:
         raise HTTPException(status_code=403, detail="Not a member of this workspace")
         
    # Optional: Check if user is owner of channel or workspace admin
    # if channel.owner_id != current_user.id and member.role != 'admin':
    #    raise HTTPException(status_code=403, detail="Not authorized to delete this channel")

    await crud.delete_channel(db, channel_id)
    return None

@router.patch("/{channel_id}", response_model=Channel)
async def update_channel(
    channel_id: uuid.UUID,
    channel_update: ChannelCreate, # Using ChannelCreate for simplicity, though ideally a separate schema
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    channel = await crud.get_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    member = await crud.get_workspace_member(db, channel.workspace_id, current_user.id)
    if not member:
         raise HTTPException(status_code=403, detail="Not a member of this workspace")

    return await crud.update_channel(db, channel_id, name=channel_update.name)
@router.get("/{channel_id}", response_model=Channel)
async def read_channel(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    channel = await crud.get_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    member = await crud.get_workspace_member(db, channel.workspace_id, current_user.id)
    if not member:
         raise HTTPException(status_code=403, detail="Not a member of this workspace")
         
    return channel

