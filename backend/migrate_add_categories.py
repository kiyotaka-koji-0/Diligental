import asyncio
from database import engine
from sqlalchemy import text

async def migrate_add_categories():
    """Add Category table and update Channel table with category support"""
    async with engine.begin() as conn:
        # Create categories table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY,
                workspace_id UUID NOT NULL,
                name VARCHAR NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
        """))
        
        # Add category_id column if it doesn't exist
        await conn.execute(text("""
            ALTER TABLE channels
            ADD COLUMN IF NOT EXISTS category_id UUID
        """))
        
        # Add position column if it doesn't exist
        await conn.execute(text("""
            ALTER TABLE channels
            ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0
        """))
        
        # Add foreign key constraint if it doesn't exist
        try:
            await conn.execute(text("""
                ALTER TABLE channels
                ADD CONSTRAINT fk_channels_category_id 
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            """))
        except Exception as e:
            if "already exists" in str(e):
                print("Foreign key constraint already exists, skipping...")
            else:
                raise
        
        await conn.commit()
        print("Migration completed: Added categories table and updated channels table")

if __name__ == "__main__":
    asyncio.run(migrate_add_categories())
