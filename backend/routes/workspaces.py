from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import uuid

import crud, models, schemas
from database import get_db
from deps import get_current_user

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

@router.post("/", response_model=schemas.Workspace)
async def create_workspace_endpoint(workspace: schemas.WorkspaceCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return await crud.create_workspace(db=db, workspace=workspace, user_id=current_user.id)

@router.get("/{workspace_id}/invite", response_model=dict)
async def get_invite_code(workspace_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify user is owner or admin (for now, any member can see it? No, usually admins. Let's restrict to owner for MVP)
    # Actually, let's allow any member for ease of testing unless specified. Slack allows any member usually.
    # But wait, I need to check membership first.
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
         raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Ideally only admins should see invite codes, but let's check role if we have it? 
    # member.role. But for now, let's just allow it.
    
    # Fetch workspace to get code
    # crud.get_workspace doesn't exist? I typically use custom queries in crud or just session.get
    workspace = await db.get(models.Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    return {"invite_code": workspace.invite_code}

@router.post("/{workspace_id}/invite-code", response_model=dict)
async def regenerate_invite_code(workspace_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify membership and admin/owner role
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
         raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Ideally restrict to 'admin' or owner. Assuming 'admin' role exists for owner.
    if member.role != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can regenerate invite codes")

    workspace = await db.get(models.Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    import secrets
    workspace.invite_code = secrets.token_urlsafe(6)
    await db.commit()
    await db.refresh(workspace)
    
    return {"invite_code": workspace.invite_code}

@router.post("/join", response_model=schemas.Workspace)
async def join_workspace(request: schemas.JoinWorkspaceRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Find workspace by invite code
    result = await db.execute(select(models.Workspace).filter(models.Workspace.invite_code == request.invite_code))
    workspace = result.scalars().first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Check if already member
    existing_member = await crud.get_workspace_member(db, workspace.id, current_user.id)
    if existing_member:
        return workspace # Already joined
        
    # Add member
    await crud.add_workspace_member(db, workspace.id, current_user.id, role="member")
    
    return workspace

@router.get("/", response_model=List[schemas.WorkspaceOut])
async def get_my_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return await crud.get_user_workspaces(db=db, user_id=current_user.id)

@router.get("/{workspace_id}", response_model=schemas.WorkspaceOut)
async def get_workspace(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify membership
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    workspace = await crud.get_workspace(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@router.get("/{workspace_id}/members", response_model=List[schemas.WorkspaceMemberOut])
async def get_workspace_members(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify membership
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
         raise HTTPException(status_code=403, detail="Not a member of this workspace")
         
    # Fetch members (need a CRUD method or direct query)
    # Let's add crud.get_workspace_members
    return await crud.get_workspace_members(db, workspace_id)

@router.post("/{workspace_id}/categories", response_model=schemas.Category)
async def create_category(
    workspace_id: uuid.UUID,
    category: schemas.CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify membership
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    return await crud.create_category(db, workspace_id, category.name)

@router.get("/{workspace_id}/categories", response_model=List[schemas.Category])
async def get_categories(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify membership
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    return await crud.get_categories(db, workspace_id)

@router.patch("/{workspace_id}/channels/{channel_id}", response_model=schemas.Channel)
async def update_channel(
    workspace_id: uuid.UUID,
    channel_id: uuid.UUID,
    channel_update: schemas.ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify membership
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Verify channel belongs to workspace
    result = await db.execute(select(models.Channel).filter(models.Channel.id == channel_id, models.Channel.workspace_id == workspace_id).options(selectinload(models.Channel.members)))
    channel = result.scalars().first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    updated = await crud.update_channel_category(db, str(channel_id), str(channel_update.category_id) if channel_update.category_id else None, channel_update.position)
    
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update channel")
    
    # Re-fetch the updated channel with relationships eager-loaded
    result = await db.execute(select(models.Channel).filter(models.Channel.id == channel_id).options(selectinload(models.Channel.members)))
    return result.scalars().first()

@router.delete("/{workspace_id}/categories/{category_id}")
async def delete_category(
    workspace_id: uuid.UUID,
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify membership
    member = await crud.get_workspace_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Verify category belongs to workspace
    result = await db.execute(select(models.Category).filter(models.Category.id == category_id, models.Category.workspace_id == workspace_id))
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Delete the category (cascade will handle channels)
    db.delete(category)
    await db.commit()
    
    return {"status": "ok"}

