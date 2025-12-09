from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    tailnet_ip: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"

class UserOut(UserBase):
    id: uuid.UUID
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Channel Schemas
class ChannelBase(BaseModel):
    name: str
    description: Optional[str] = None

class ChannelCreate(ChannelBase):
    workspace_id: uuid.UUID

class Channel(ChannelBase):
    id: uuid.UUID
    created_at: datetime
    owner_id: Optional[uuid.UUID] = None
    workspace_id: uuid.UUID

    class Config:
        from_attributes = True

# Message Schemas
class MessageBase(BaseModel):
    content: str
    channel_id: uuid.UUID

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: uuid.UUID
    created_at: datetime
    user_id: uuid.UUID
    user: Optional[UserOut] = None # Embed basic user info
    parent_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

# Workspace Schemas
class WorkspaceBase(BaseModel):
    name: str

class WorkspaceCreate(WorkspaceBase):
    pass

class Workspace(WorkspaceBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    invite_code: str | None = None  # Allow None for older workspaces or before migration, theoretically

    class Config:
        from_attributes = True

class JoinWorkspaceRequest(BaseModel):
    invite_code: str

class WorkspaceOut(WorkspaceBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    # Invite code is optional in output, usually hidden unless specifically requested or if user is owner.
    # We can omit it here or include it. For simplicity, let's include it for now, 
    # but ideally we'd have a separate OwnerWorkspaceOut.
    # Actually wait, standard list view shouldn't expose invite codes for everyone.
    # Let's keep it minimal for lists.
    
    class Config:
        from_attributes = True

class WorkspaceMemberBase(BaseModel):
    role: str

class WorkspaceMemberOut(WorkspaceMemberBase):
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    joined_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True
