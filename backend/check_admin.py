#!/usr/bin/env python3
"""
Script to check and update admin user roles in the database.
Run this to verify if your admin account has the correct role.
"""

import asyncio
import sys
sys.path.insert(0, '/home/kiyotaka/Documents/Coding_Repos/Diligental/backend')

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from models import User, Base
from security import get_password_hash

DATABASE_URL = "sqlite+aiosqlite:///./test.db"

async def check_and_setup_admin():
    """Check existing users and optionally set up an admin user."""
    
    # Create engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session factory
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    # Create and use session with proper context manager
    async with async_session() as session:
        # Fetch all users
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        print("\n" + "="*60)
        print("USERS IN DATABASE")
        print("="*60)
        
        if not users:
            print("No users found in database.")
            print("\nCreating default admin user...")
            
            # Create default admin
            admin_user = User(
                email="admin@diligental.com",
                username="admin",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                role="admin"
            )
            session.add(admin_user)
            await session.commit()
            print("✓ Created admin user")
            print("  Email: admin@diligental.com")
            print("  Username: admin")
            print("  Password: admin123")
        else:
            for user in users:
                print(f"\nUsername: {user.username}")
                print(f"Email: {user.email}")
                print(f"Full Name: {user.full_name}")
                print(f"Role: {user.role}")
                print(f"Created: {user.created_at}")
                
                # Check if this is an admin
                if user.role == "admin":  # type: ignore
                    print(f"✓ This is an ADMIN account")
                else:
                    print(f"✗ This is a regular USER account")
            
            # Ask if user wants to set an admin
            print("\n" + "="*60)
            print("ADMIN SETUP")
            print("="*60)
            
            first_user = users[0]
            response = input(f"\nWould you like to make '{first_user.username}' an admin? (y/n): ").strip().lower()
            
            if response == 'y':
                first_user.role = "admin"  # type: ignore
                session.add(first_user)
                await session.commit()
                print(f"✓ {first_user.username} is now an admin!")
    
    await engine.dispose()
    print("\n" + "="*60)
    print("Done!")
    print("="*60 + "\n")

async def main():
    await check_and_setup_admin()

if __name__ == "__main__":
    asyncio.run(main())
if __name__ == "__main__":
    asyncio.run(check_and_setup_admin())
