"""
EUAdmin Backend - Database connection
Connects to EUCloud database for user and file data.
"""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
from datetime import datetime

logger = logging.getLogger(__name__)

# EUCloud uses SQLite database stored in /app/instance/eucloud.db
# This path is shared via PVC with eucloud-backend
DATABASE_PATH = os.getenv("DATABASE_PATH", "/app/instance/eucloud.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

logger.info(f"Connecting to database: {DATABASE_URL}")

# Create engine - SQLite needs check_same_thread=False for multi-threading
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def format_datetime(value) -> Optional[str]:
    """Convert datetime value to ISO format string. Handles both datetime objects and strings."""
    if value is None:
        return None
    if isinstance(value, str):
        # Already a string, return as-is (SQLite stores as string)
        return value
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return str(value)


@contextmanager
def get_db_session():
    """Get a database session context manager."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database error: {e}")
        raise e
    finally:
        session.close()


def get_all_users() -> List[Dict[str, Any]]:
    """Get all users from the database."""
    try:
        with get_db_session() as session:
            result = session.execute(text("""
                SELECT 
                    user_id,
                    email,
                    storage_quota,
                    storage_used,
                    created_at
                FROM users
                ORDER BY created_at DESC
            """))
            
            users = []
            for row in result:
                users.append({
                    "id": row.user_id,
                    "user_id": str(row.user_id),
                    "username": row.email.split('@')[0] if row.email else f"user_{row.user_id}",
                    "email": row.email,
                    "avatar_color": None,
                    "is_active": True,
                    "storage_quota": row.storage_quota,
                    "storage_used": row.storage_used,
                    "storage_quota_gb": round(row.storage_quota / (1024**3), 2) if row.storage_quota else 0,
                    "storage_used_gb": round(row.storage_used / (1024**3), 2) if row.storage_used else 0,
                    "created_at": row.created_at,
                    "last_login": None,
                })
            
            logger.info(f"Retrieved {len(users)} users from database")
            return users
            
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        return []


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific user by their user_id."""
    try:
        with get_db_session() as session:
            result = session.execute(text("""
                SELECT 
                    user_id,
                    email,
                    storage_quota,
                    storage_used,
                    created_at
                FROM users
                WHERE user_id = :user_id
            """), {"user_id": int(user_id)})
            
            row = result.fetchone()
            if not row:
                return None
            
            return {
                "id": row.user_id,
                "user_id": str(row.user_id),
                "username": row.email.split('@')[0] if row.email else f"user_{row.user_id}",
                "email": row.email,
                "avatar_color": None,
                "is_active": True,
                "storage_quota": row.storage_quota,
                "storage_used": row.storage_used,
                "storage_quota_gb": round(row.storage_quota / (1024**3), 2) if row.storage_quota else 0,
                "storage_used_gb": round(row.storage_used / (1024**3), 2) if row.storage_used else 0,
                "created_at": row.created_at,
                "last_login": None,
            }
            
    except Exception as e:
        logger.error(f"Failed to get user {user_id}: {e}")
        return None


def get_user_storage(user_id: str) -> Dict[str, Any]:
    """Get storage usage for a specific user."""
    try:
        with get_db_session() as session:
            result = session.execute(text("""
                SELECT 
                    COUNT(*) as file_count,
                    COALESCE(SUM(file_size), 0) as total_bytes
                FROM files
                WHERE owner_id = :user_id AND (is_deleted = 0 OR is_deleted IS NULL)
            """), {"user_id": int(user_id)})
            
            row = result.fetchone()
            total_bytes = row.total_bytes if row else 0
            file_count = row.file_count if row else 0
            
            # Get storage by type
            result2 = session.execute(text("""
                SELECT 
                    CASE 
                        WHEN mime_type LIKE 'image/%' THEN 'images'
                        WHEN mime_type LIKE 'video/%' THEN 'videos'
                        WHEN mime_type LIKE 'audio/%' THEN 'audio'
                        WHEN mime_type LIKE 'application/pdf' THEN 'documents'
                        WHEN mime_type LIKE 'application/%' THEN 'documents'
                        WHEN mime_type LIKE 'text/%' THEN 'documents'
                        ELSE 'other'
                    END as file_type,
                    COUNT(*) as count,
                    COALESCE(SUM(file_size), 0) as bytes
                FROM files
                WHERE owner_id = :user_id AND (is_deleted = 0 OR is_deleted IS NULL)
                GROUP BY 1
            """), {"user_id": int(user_id)})
            
            storage_by_type = {}
            for row in result2:
                storage_by_type[row.file_type] = {
                    "count": row.count,
                    "bytes": row.bytes,
                    "mb": round(row.bytes / (1024 * 1024), 2)
                }
            
            return {
                "user_id": user_id,
                "total_files": file_count,
                "total_bytes": total_bytes,
                "total_mb": round(total_bytes / (1024 * 1024), 2),
                "total_gb": round(total_bytes / (1024 * 1024 * 1024), 4),
                "storage_by_type": storage_by_type
            }
            
    except Exception as e:
        logger.error(f"Failed to get storage for user {user_id}: {e}")
        return {
            "user_id": user_id,
            "total_files": 0,
            "total_bytes": 0,
            "total_mb": 0,
            "total_gb": 0,
            "storage_by_type": {}
        }


def get_total_storage() -> Dict[str, Any]:
    """Get total storage usage across all users."""
    try:
        with get_db_session() as session:
            result = session.execute(text("""
                SELECT 
                    COUNT(*) as file_count,
                    COALESCE(SUM(file_size), 0) as total_bytes,
                    COUNT(DISTINCT owner_id) as user_count
                FROM files
                WHERE is_deleted = 0 OR is_deleted IS NULL
            """))
            
            row = result.fetchone()
            total_bytes = row.total_bytes if row else 0
            
            return {
                "total_files": row.file_count if row else 0,
                "total_bytes": total_bytes,
                "total_mb": round(total_bytes / (1024 * 1024), 2),
                "total_gb": round(total_bytes / (1024 * 1024 * 1024), 4),
                "users_with_files": row.user_count if row else 0
            }
            
    except Exception as e:
        logger.error(f"Failed to get total storage: {e}")
        return {
            "total_files": 0,
            "total_bytes": 0,
            "total_mb": 0,
            "total_gb": 0,
            "users_with_files": 0
        }


def get_user_activity(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get recent activity for a user."""
    try:
        with get_db_session() as session:
            # Check if activities table exists
            try:
                result = session.execute(text("""
                    SELECT 
                        activity_type as action,
                        activity_details as detail,
                        created_at as timestamp
                    FROM activities
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                    LIMIT :limit
                """), {"user_id": int(user_id), "limit": limit})
                
                activities = []
                for row in result:
                    activities.append({
                        "action": row.action,
                        "detail": row.detail,
                        "timestamp": format_datetime(row.timestamp),
                        "metadata": {}
                    })
                return activities
            except:
                pass
            
            # Fallback: Get recent file uploads as activity
            result = session.execute(text("""
                SELECT 
                    'upload' as action,
                    filename as detail,
                    created_at as timestamp,
                    file_size
                FROM files
                WHERE owner_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
            """), {"user_id": int(user_id), "limit": limit})
            
            activities = []
            for row in result:
                activities.append({
                    "action": row.action,
                    "detail": row.detail,
                    "timestamp": format_datetime(row.timestamp),
                    "metadata": {"size": row.file_size}
                })
            
            return activities
            
    except Exception as e:
        logger.error(f"Failed to get activity for user {user_id}: {e}")
        return []


def delete_user(user_id: str) -> bool:
    """Delete a user and all their data."""
    try:
        with get_db_session() as session:
            uid = int(user_id)
            
            # Delete shares first (foreign key constraint)
            session.execute(text("""
                DELETE FROM shares WHERE created_by = :user_id
            """), {"user_id": uid})
            
            # Delete file versions
            session.execute(text("""
                DELETE FROM file_versions WHERE file_id IN (
                    SELECT file_id FROM files WHERE owner_id = :user_id
                )
            """), {"user_id": uid})
            
            # Delete file tags
            session.execute(text("""
                DELETE FROM file_tags WHERE file_id IN (
                    SELECT file_id FROM files WHERE owner_id = :user_id
                )
            """), {"user_id": uid})
            
            # Delete comments
            session.execute(text("""
                DELETE FROM comments WHERE user_id = :user_id
            """), {"user_id": uid})
            
            # Delete activities
            session.execute(text("""
                DELETE FROM activities WHERE user_id = :user_id
            """), {"user_id": uid})
            
            # Delete tags
            session.execute(text("""
                DELETE FROM tags WHERE user_id = :user_id
            """), {"user_id": uid})
            
            # Delete user's files
            session.execute(text("""
                DELETE FROM files WHERE owner_id = :user_id
            """), {"user_id": uid})
            
            # Delete user's folders
            session.execute(text("""
                DELETE FROM folders WHERE owner_id = :user_id
            """), {"user_id": uid})
            
            # Delete the user
            session.execute(text("""
                DELETE FROM users WHERE user_id = :user_id
            """), {"user_id": uid})
            
            logger.info(f"Deleted user {user_id} and all associated data")
            return True
            
    except Exception as e:
        logger.error(f"Failed to delete user {user_id}: {e}")
        return False


def block_user(user_id: str) -> bool:
    """Block/deactivate a user - set storage quota to 0 to prevent uploads."""
    try:
        with get_db_session() as session:
            session.execute(text("""
                UPDATE users SET storage_quota = 0 WHERE user_id = :user_id
            """), {"user_id": int(user_id)})
            logger.info(f"Blocked user {user_id}")
            return True
            
    except Exception as e:
        logger.error(f"Failed to block user {user_id}: {e}")
        return False


def unblock_user(user_id: str) -> bool:
    """Unblock/activate a user - restore default storage quota."""
    try:
        with get_db_session() as session:
            session.execute(text("""
                UPDATE users SET storage_quota = 5368709120 WHERE user_id = :user_id
            """), {"user_id": int(user_id)})
            logger.info(f"Unblocked user {user_id}")
            return True
            
    except Exception as e:
        logger.error(f"Failed to unblock user {user_id}: {e}")
        return False


def reset_user_storage(user_id: str) -> bool:
    """Delete all files for a user (reset storage)."""
    try:
        with get_db_session() as session:
            uid = int(user_id)
            
            # Soft delete all files
            session.execute(text("""
                UPDATE files SET is_deleted = 1, deleted_at = datetime('now') 
                WHERE owner_id = :user_id
            """), {"user_id": uid})
            
            # Reset storage_used counter
            session.execute(text("""
                UPDATE users SET storage_used = 0 WHERE user_id = :user_id
            """), {"user_id": uid})
            
            logger.info(f"Reset storage for user {user_id}")
            return True
            
    except Exception as e:
        logger.error(f"Failed to reset storage for user {user_id}: {e}")
        return False


def get_system_stats() -> Dict[str, Any]:
    """Get overall system statistics."""
    try:
        with get_db_session() as session:
            # Total users
            users_result = session.execute(text("SELECT COUNT(*) as count FROM users"))
            total_users = users_result.fetchone().count
            
            # Active users (created in last 24h as proxy for activity)
            active_result = session.execute(text("""
                SELECT COUNT(*) as count FROM users 
                WHERE created_at > datetime('now', '-24 hours')
            """))
            active_users = active_result.fetchone().count
            
            # Storage stats
            storage = get_total_storage()
            
            return {
                "total_users": total_users,
                "active_users_24h": active_users,
                "total_storage": storage
            }
            
    except Exception as e:
        logger.error(f"Failed to get system stats: {e}")
        return {
            "total_users": 0,
            "active_users_24h": 0,
            "total_storage": {}
        }


def get_users_with_storage() -> List[Dict[str, Any]]:
    """Get all users with their storage statistics."""
    try:
        with get_db_session() as session:
            result = session.execute(text("""
                SELECT 
                    u.user_id,
                    u.email,
                    u.storage_quota,
                    u.storage_used,
                    u.created_at,
                    COUNT(f.file_id) as file_count,
                    COALESCE(SUM(f.file_size), 0) as actual_storage
                FROM users u
                LEFT JOIN files f ON u.user_id = f.owner_id AND (f.is_deleted = 0 OR f.is_deleted IS NULL)
                GROUP BY u.user_id, u.email, u.storage_quota, u.storage_used, u.created_at
                ORDER BY u.created_at DESC
            """))
            
            users = []
            for row in result:
                users.append({
                    "id": row.user_id,
                    "user_id": str(row.user_id),
                    "username": row.email.split('@')[0] if row.email else f"user_{row.user_id}",
                    "email": row.email,
                    "avatar_color": None,
                    "is_active": row.storage_quota > 0,
                    "storage_quota": row.storage_quota,
                    "storage_used": row.storage_used,
                    "storage_quota_gb": round(row.storage_quota / (1024**3), 2) if row.storage_quota else 0,
                    "storage_used_gb": round(row.storage_used / (1024**3), 2) if row.storage_used else 0,
                    "file_count": row.file_count,
                    "actual_storage": row.actual_storage,
                    "actual_storage_mb": round(row.actual_storage / (1024**2), 2) if row.actual_storage else 0,
                    "created_at": row.created_at,
                    "last_login": None,
                })
            
            return users
            
    except Exception as e:
        logger.error(f"Failed to get users with storage: {e}")
        return []
