from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from database import get_db
from crud import get_user_by_username, create_user, get_user_by_email
from schemas import Token, UserCreate, WorkspaceCreate, ChannelCreate
from security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
import crud
import schemas

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # Try fetching by username first
    user = await get_user_by_username(db, username=form_data.username)
    # If not found, try fetching by email (since frontend might send email as username)
    if not user:
        user = await get_user_by_email(db, email=form_data.username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login", response_model=Token)
async def login_json(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Login with email
    from crud import get_user_by_email
    user = await get_user_by_email(db, email=login_data.email)
    if not user or not verify_password(login_data.password, user.hashed_password):
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
    
@router.post("/register", response_model=Token)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = await get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    # Check email
    if await get_user_by_email(db, email=user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = await create_user(db=db, user=user)
    
    # Create Default Workspace
    ws_create = WorkspaceCreate(name=f"{new_user.username}'s Workspace")
    workspace = await crud.create_workspace(db=db, workspace=ws_create, user_id=new_user.id)
    
    # Create Default Channels
    for channel_name in ["general", "random"]:
        ch_create = ChannelCreate(
            name=channel_name, 
            description=f"Default {channel_name} channel",
            workspace_id=workspace.id  # Required by schema now
        )
        await crud.create_channel(db=db, channel=ch_create, owner_id=new_user.id, workspace_id=workspace.id)
    
    # Auto login after register
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
