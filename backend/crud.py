from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, Channel, Message
import models
from schemas import UserCreate, ChannelCreate, MessageCreate
import schemas
from security import get_password_hash

async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(User).filter(User.username == username))
    return result.scalars().first()

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        tailnet_ip=user.tailnet_ip
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
   result = await db.execute(select(User).offset(skip).limit(limit))
   return result.scalars().all()

# Channels
from models import Channel, Message
from schemas import ChannelCreate, MessageCreate
import uuid

async def get_channel_by_name(db: AsyncSession, name: str):
    result = await db.execute(select(Channel).filter(Channel.name == name))
    return result.scalars().first()

async def get_channel(db: AsyncSession, channel_id: uuid.UUID):
    result = await db.execute(select(Channel).filter(Channel.id == channel_id))
    return result.scalars().first()

async def create_channel(db: AsyncSession, channel: ChannelCreate, owner_id: uuid.UUID, workspace_id: uuid.UUID):
    db_channel = Channel(
        name=channel.name,
        description=channel.description,
        owner_id=owner_id,
        workspace_id=workspace_id
    )
    db.add(db_channel)
    await db.commit()
    await db.refresh(db_channel)
    return db_channel

async def get_channels(db: AsyncSession, workspace_id: uuid.UUID, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(Channel)
        .filter(Channel.workspace_id == workspace_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

# Messages
async def create_message(db: AsyncSession, message: MessageCreate, user_id: uuid.UUID):
    db_message = Message(
        content=message.content,
        channel_id=message.channel_id,
        user_id=user_id
    )
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)
    return db_message

# Workspace CRUD
async def create_workspace(db: AsyncSession, workspace: schemas.WorkspaceCreate, user_id: uuid.UUID):
    db_workspace = models.Workspace(name=workspace.name, owner_id=user_id)
    db.add(db_workspace)
    await db.commit()
    await db.refresh(db_workspace)

    # Add owner as admin member
    member = models.WorkspaceMember(workspace_id=db_workspace.id, user_id=user_id, role="admin")
    db.add(member)
    await db.commit()
    return db_workspace

async def get_user_workspaces(db: AsyncSession, user_id: uuid.UUID):
    # Join WorkspaceMember to find workspaces the user belongs to
    result = await db.execute(
        select(models.Workspace)
        .join(models.WorkspaceMember)
        .filter(models.WorkspaceMember.user_id == user_id)
    )
    return result.scalars().all()

async def get_workspace(db: AsyncSession, workspace_id: uuid.UUID):
    result = await db.execute(select(models.Workspace).filter(models.Workspace.id == workspace_id))
    return result.scalars().first()

async def get_workspace_member(db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID):
    result = await db.execute(
        select(models.WorkspaceMember).filter(
            models.WorkspaceMember.workspace_id == workspace_id,
            models.WorkspaceMember.user_id == user_id
        )
    )
    return result.scalars().first()

from sqlalchemy.orm import joinedload

async def get_messages(db: AsyncSession, channel_id: uuid.UUID, skip: int = 0, limit: int = 50):
    result = await db.execute(
        select(Message)
        .options(joinedload(Message.user))
        .filter(Message.channel_id == channel_id)
        .order_by(Message.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
async def add_workspace_member(db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID, role: str = "member"):
    db_member = models.WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
    db.add(db_member)
    await db.commit()
    await db.refresh(db_member)
    return db_member

async def delete_channel(db: AsyncSession, channel_id: uuid.UUID):
    db_channel = await get_channel(db, channel_id)
    if db_channel:
        await db.delete(db_channel)
        await db.commit()
    return db_channel

async def update_channel(db: AsyncSession, channel_id: uuid.UUID, name: str):
    db_channel = await get_channel(db, channel_id)
    if db_channel:
        db_channel.name = name
        await db.commit()
        await db.refresh(db_channel)
    return db_channel
