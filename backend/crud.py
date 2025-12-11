from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
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
from sqlalchemy.orm import joinedload, selectinload
import uuid

async def get_channel_by_name(db: AsyncSession, name: str):
    result = await db.execute(select(Channel).filter(Channel.name == name))
    return result.scalars().first()

async def get_channel(db: AsyncSession, channel_id: uuid.UUID):
    result = await db.execute(
        select(Channel)
        .options(joinedload(Channel.members).joinedload(models.ChannelMember.user))
        .filter(Channel.id == channel_id)
    )
    return result.scalars().first()

async def create_channel(db: AsyncSession, channel: ChannelCreate, owner_id: uuid.UUID, workspace_id: uuid.UUID):
    db_channel = Channel(
        name=channel.name,
        description=channel.description,
        type=channel.type,
        owner_id=owner_id,
        workspace_id=workspace_id
    )
    db.add(db_channel)
    await db.commit()
    
    # Eagerly load members relationship to avoid lazy load issues
    from sqlalchemy import select
    result = await db.execute(
        select(Channel)
        .options(selectinload(Channel.members).selectinload(models.ChannelMember.user))
        .filter(Channel.id == db_channel.id)
    )
    return result.scalars().first()

async def get_channels(db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID, skip: int = 0, limit: int = 100):
    # Filter channels:
    # 1. Public/Voice channels are visible to all (or logic to be refined)
    # 2. Private/DM channels are visible ONLY if user is a member
    
    from sqlalchemy import or_, and_
    
    stmt = (
        select(Channel)
        .options(joinedload(Channel.members).joinedload(models.ChannelMember.user))
        .outerjoin(models.ChannelMember, and_(
            models.ChannelMember.channel_id == Channel.id,
            models.ChannelMember.user_id == user_id
        ))
        .filter(Channel.workspace_id == workspace_id)
        .filter(
            or_(
                Channel.type.in_(['public', 'voice']),
                and_(
                    Channel.type.in_(['private', 'dm']),
                    models.ChannelMember.user_id == user_id
                )
            )
        )
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    return result.scalars().unique().all()

async def get_or_create_dm_channel(db: AsyncSession, workspace_id: uuid.UUID, user1_id: uuid.UUID, user2_id: uuid.UUID):
    # Check for existing DM
    # SQL: Select channel_id from channel_members where user_id in (u1, u2) group by channel_id having count=2
    # In SQLAlchemy ORM this is tricky, let's do a subquery or simplified check.
    # Since DM is a unique pair in a workspace...
    
    # 1. Find all channels user1 is in with type='dm'
    # 2. Filter which of those user2 is also in.
    
    # Efficient enough for now:
    stmt = (
        select(models.Channel)
        .join(models.ChannelMember, models.Channel.id == models.ChannelMember.channel_id)
        .filter(
            models.Channel.workspace_id == workspace_id,
            models.Channel.type == 'dm',
            models.ChannelMember.user_id == user1_id
        )
    )
    result = await db.execute(stmt)
    user1_dms = result.scalars().all()
    
    for channel in user1_dms:
        # Check if user2 is a member
        stmt2 = select(models.ChannelMember).filter(
            models.ChannelMember.channel_id == channel.id,
            models.ChannelMember.user_id == user2_id
        )
        res2 = await db.execute(stmt2)
        if res2.scalars().first():
            return channel

            return channel

    # Create new DM
    # Name convention: "DM" (frontend can resolve actual names based on members)
    new_channel = models.Channel(
        name="direct_message", # Placeholder
        type="dm",
        workspace_id=workspace_id,
        owner_id=user1_id
    )
    db.add(new_channel)
    await db.flush()
    
    # Add members
    member1 = models.ChannelMember(channel_id=new_channel.id, user_id=user1_id)
    member2 = models.ChannelMember(channel_id=new_channel.id, user_id=user2_id)
    db.add(member1)
    db.add(member2)
    
    await db.commit()
    
    # Re-fetch to load relationships
    stmt = (
        select(models.Channel)
        .options(joinedload(models.Channel.members).joinedload(models.ChannelMember.user))
        .filter(models.Channel.id == new_channel.id)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


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
    
    # Link Attachments
    if message.attachment_ids:
        from models import Attachment
        stmt = select(Attachment).filter(Attachment.id.in_(message.attachment_ids))
        result = await db.execute(stmt)
        attachments = result.scalars().all()
        for attachment in attachments:
            attachment.message_id = db_message.id
    
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
    
    # Reload message with attachments eagerly loaded to prevent greenlet error in WS
    result = await db.execute(
        select(Message)
        .options(joinedload(Message.attachments))
        .filter(Message.id == db_message.id)
    )
    db_message = result.unique().scalars().first()

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

async def get_workspace_members(db: AsyncSession, workspace_id: uuid.UUID):
    result = await db.execute(
        select(models.WorkspaceMember)
        .options(joinedload(models.WorkspaceMember.user))
        .filter(models.WorkspaceMember.workspace_id == workspace_id)
    )
    return result.scalars().all()


from sqlalchemy.orm import joinedload

async def get_messages(db: AsyncSession, channel_id: uuid.UUID, skip: int = 0, limit: int = 50, parent_id: uuid.UUID = None):
    query = select(Message).options(
        joinedload(Message.user),
        selectinload(Message.reactions).joinedload(models.Reaction.user),
        selectinload(Message.attachments)
    ).filter(Message.channel_id == channel_id)
    
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

# Thread functions
async def get_thread_replies_count(db: AsyncSession, parent_id: uuid.UUID):
    """Get count of replies for a thread"""
    result = await db.execute(
        select(func.count(Message.id)).filter(Message.parent_id == parent_id)
    )
    return result.scalar() or 0

async def get_thread_messages(db: AsyncSession, parent_id: uuid.UUID, skip: int = 0, limit: int = 50):
    """Get all replies in a thread with user info"""
    result = await db.execute(
        select(Message)
        .options(
            joinedload(Message.user),
            selectinload(Message.reactions).joinedload(models.Reaction.user),
            selectinload(Message.attachments)
        )
        .filter(Message.parent_id == parent_id)
        .order_by(Message.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_message_with_user(db: AsyncSession, message_id: uuid.UUID):
    """Get a single message with user info"""
    result = await db.execute(
        select(Message)
        .options(
            joinedload(Message.user),
            selectinload(Message.reactions).joinedload(models.Reaction.user),
            selectinload(Message.attachments)
        )
        .filter(Message.id == message_id)
    )
    return result.scalar_one_or_none()

# Reaction functions
async def add_reaction(db: AsyncSession, message_id: uuid.UUID, user_id: uuid.UUID, emoji: str):
    """Add a reaction to a message"""
    from models import Reaction
    
    # Check if user already reacted with this emoji
    existing = await db.execute(
        select(Reaction).filter(
            Reaction.message_id == message_id,
            Reaction.user_id == user_id,
            Reaction.emoji == emoji
        )
    )
    if existing.scalar_one_or_none():
        return None  # Already exists
    
    reaction = Reaction(
        message_id=message_id,
        user_id=user_id,
        emoji=emoji
    )
    db.add(reaction)
    await db.commit()
    await db.refresh(reaction)
    return reaction

async def remove_reaction(db: AsyncSession, message_id: uuid.UUID, user_id: uuid.UUID, emoji: str):
    """Remove a reaction from a message"""
    from models import Reaction
    
    result = await db.execute(
        select(Reaction).filter(
            Reaction.message_id == message_id,
            Reaction.user_id == user_id,
            Reaction.emoji == emoji
        )
    )
    reaction = result.scalar_one_or_none()
    if reaction:
        await db.delete(reaction)
        await db.commit()
        return True
    return False

async def get_message_reactions(db: AsyncSession, message_id: uuid.UUID):
    """Get all reactions for a message with user info"""
    from models import Reaction
    
    result = await db.execute(
        select(Reaction)
        .options(joinedload(Reaction.user))
        .filter(Reaction.message_id == message_id)
        .order_by(Reaction.created_at.asc())
    )
    return result.scalars().all()
