"""
Re-export database connection components from app.database.connection
for seamless backward compatibility.
"""

from app.database.connection import engine, SessionLocal, Base, get_db

__all__ = ["engine", "SessionLocal", "Base", "get_db"]
