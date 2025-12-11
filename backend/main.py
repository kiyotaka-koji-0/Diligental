from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import redis.asyncio as redis
from contextlib import asynccontextmanager
from database import engine, Base, async_session_maker
from routes import auth, users, channels, ws, workspaces, notifications, files
from crud import get_user_by_username, create_user
from schemas import UserCreate
from fastapi.staticfiles import StaticFiles

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Configure mappers to ensure all relationships are set up
    from sqlalchemy.orm import configure_mappers
    try:
        configure_mappers()
    except Exception as e:
        print(f"Mapper configuration warning: {e}")
    
    # Seed Default Admin
    async with async_session_maker() as db:
        try:
            admin = await get_user_by_username(db, "admin")
            if not admin:
                print("Seeding default admin user...")
                await create_user(db, UserCreate(
                    email="admin@example.com",
                    username="admin",
                    password="admin123",
                    role="admin",
                    full_name="System Admin"
                ))
                print("Default admin created: admin / admin123")
        except Exception as e:
            print(f"Error seeding admin: {e}")

    # Redis connection
    app.state.redis = redis.from_url(REDIS_URL)
    yield
    # Shutdown
    await app.state.redis.close()

app = FastAPI(title="Diligental API", version="0.1.0", lifespan=lifespan)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:8005",
    "https://kiyotaka.starling-kanyu.ts.net",
    "https://kiyotaka.starling-kanyu.ts.net:8443",
    "*" # Keep wildcard for now as fallback, but specific origins help with credentials
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(channels.router)
app.include_router(ws.router)
app.include_router(workspaces.router)
app.include_router(notifications.router)
app.include_router(files.router)

# Mount static files
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

@app.get("/")
async def root():
    return {"message": "Welcome to Diligental API"}

@app.get("/health")
async def health_check():
    try:
        await app.state.redis.ping()
        return {"status": "ok", "redis": "connected"}
    except Exception as e:
        return {"status": "degraded", "redis": str(e)}
