from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, Channel, Message, Notification
import models
import re
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
        user_id=user_id,
        parent_id=message.parent_id
    )
    db.add(db_message)
    await db.flush() # Ensure ID is generated
    
    new_notifications = []

    # Handle Notifications
    # 1. Mentions
    mentions = re.findall(r"@(\w+)", message.content)
    # Deduplicate mentions
    mentions = list(set(mentions))
    
    for username in mentions:
        user = await get_user_by_username(db, username)
        if user and user.id != user_id:
            notif = models.Notification(
                user_id=user.id,
                content=f"You were mentioned by a user",
                type="mention",
                related_id=db_message.id
            )
            db.add(notif)
            new_notifications.append(notif)
            
    # 2. Replies
    if message.parent_id:
        parent_msg = await db.get(Message, message.parent_id)
        if parent_msg and parent_msg.user_id != user_id:
            # Check if we already notified via mention to avoid double notify?
            # For simplicity, create separate notification or check logic.
            # Let's just create it.
            notif = models.Notification(
                user_id=parent_msg.user_id,
                content="New reply to your message",
                type="reply",
                related_id=db_message.id
            )
            db.add(notif)
            new_notifications.append(notif)

    await db.commit()
    await db.refresh(db_message)
    # Refresh notifications to get IDs
    for n in new_notifications:
        await db.refresh(n)
        
    return db_message, new_notifications

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

async def get_messages(db: AsyncSession, channel_id: uuid.UUID, skip: int = 0, limit: int = 50, parent_id: uuid.UUID = None):
    query = select(Message).options(joinedload(Message.user)).filter(Message.channel_id == channel_id)
    
    if parent_id:
        query = query.filter(Message.parent_id == parent_id)
    else:
        query = query.filter(Message.parent_id == None)

    result = await db.execute(
        query.order_by(Message.created_at.asc())
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
    return db_channel

# Notifications
async def get_notifications(db: AsyncSession, user_id: uuid.UUID, skip: int = 0, limit: int = 50):
    result = await db.execute(
        select(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def mark_notification_read(db: AsyncSession, notification_id: uuid.UUID, user_id: uuid.UUID):
    notif = await db.get(Notification, notification_id)
    if notif and notif.user_id == user_id:
        notif.is_read = True
        await db.commit()
        await db.refresh(notif)
    return notif
