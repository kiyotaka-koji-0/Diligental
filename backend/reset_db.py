import asyncio
from database import engine, Base
from models import *  # Import all models to ensure they are registered

async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset successfully.")

if __name__ == "__main__":
    asyncio.run(reset_db())
