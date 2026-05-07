"""
Database connection and session management
"""
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, AsyncEngine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./workflow.db")

# Convert postgres:// to postgresql+asyncpg:// for async support
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode parameter as asyncpg doesn't support it
# Asyncpg uses the 'ssl' parameter in connect_args instead
# For Fly.io internal network (.internal domains), SSL is not needed
ssl_required = False
is_fly_internal = ".internal" in DATABASE_URL

if not is_fly_internal and ("?sslmode=" in DATABASE_URL or "&sslmode=" in DATABASE_URL):
    ssl_required = True

# Remove sslmode from URL as asyncpg doesn't support it in the URL
if "?sslmode=" in DATABASE_URL or "&sslmode=" in DATABASE_URL:
    if "?sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?sslmode=")[0]
    elif "&sslmode=" in DATABASE_URL:
        # Handle case where sslmode is not the first parameter
        import re
        DATABASE_URL = re.sub(r'&sslmode=[^&]*', '', DATABASE_URL)
        DATABASE_URL = re.sub(r'\?sslmode=[^&]*&', '?', DATABASE_URL)

# Create async engine with SSL support for Fly.io PostgreSQL
# Asyncpg requires SSL to be configured via connect_args, not in the URL
# For asyncpg with Fly.io PostgreSQL, we need to disable SSL cert verification
import ssl as ssl_module

# Determine if we need SSL based on the URL
# Fly.io internal network (.internal domains) doesn't require SSL
# asyncpg defaults to SSL, so we must explicitly set ssl=False for internal connections
use_ssl = (ssl_required or DATABASE_URL.startswith("postgresql")) and not is_fly_internal

# Create connect_args for asyncpg
# For Fly.io, disable SSL since internal connections don't need it
# SSL handshake can cause ConnectionResetError on Fly.io postgres
logger.info(f"Database URL detection - is_fly_internal: {is_fly_internal}, use_ssl: {use_ssl}")
logger.info(f"DATABASE_URL starts with: {DATABASE_URL[:50]}...")

# For Fly.io deployments, default to no SSL to avoid connection issues
# Fly.io internal network is secure without SSL
connect_args = {"ssl": False}

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging
    poolclass=NullPool,  # Use NullPool for serverless deployments
    connect_args=connect_args
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI routes to get database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context():
    """
    Context manager for non-FastAPI code to get database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """
    Initialize database tables
    """
    from src.database.models import Base

    try:
        async with engine.begin() as conn:
            # Create all tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_db():
    """
    Close database connections
    """
    await engine.dispose()
    logger.info("Database connections closed")