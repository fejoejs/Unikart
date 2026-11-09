"""
Database Connection and Session Management for UNIKART
Handles SQLite (development) and Supabase / PostgreSQL (production) connection pooling,
WAL mode, foreign key enforcement, and FastAPI session generators.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Normalize Supabase / Cloud Postgres URLs (convert to 'postgresql+psycopg2://')
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif database_url.startswith("postgresql://") and not database_url.startswith("postgresql+"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Automatically route Supabase pooler from session mode (:5432) to transaction mode (:6543)
# to prevent EMAXCONNSESSION pool exhaustion across multiple workers
if "pooler.supabase.com:5432" in database_url:
    database_url = database_url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30}
    engine_kwargs["connect_args"] = connect_args
else:
    # Supabase / Production PostgreSQL pooling optimization
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 5
    engine_kwargs["pool_recycle"] = 120
    engine_kwargs["pool_timeout"] = 10
    engine_kwargs["connect_args"] = {
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    }

engine = create_engine(database_url, **engine_kwargs)

# Enable foreign keys and WAL mode for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI dependency for yielding database session with automatic cleanup."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
