from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..utils.deps import get_current_active_admin

router = APIRouter()

@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_active_admin)
) -> Any:
    """
    Get system-wide metrics. Admin-only.
    """
    total_users = db.query(models.User).count()
    total_tasks = db.query(models.Task).count()
    
    pending_tasks = db.query(models.Task).filter(models.Task.status == "pending").count()
    in_progress_tasks = db.query(models.Task).filter(models.Task.status == "in_progress").count()
    completed_tasks = db.query(models.Task).filter(models.Task.status == "completed").count()
    
    return {
        "total_users": total_users,
        "total_tasks": total_tasks,
        "tasks_by_status": {
            "pending": pending_tasks,
            "in_progress": in_progress_tasks,
            "completed": completed_tasks
        }
    }


@router.get("/users", response_model=List[schemas.UserResponse])
def get_users_roster(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_active_admin)
) -> Any:
    """
    Retrieve list of all users. Admin-only.
    """
    users = db.query(models.User).all()
    return users


@router.put("/users/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_active_admin)
) -> Any:
    """
    Update a user's role (admin or user). Admin-only.
    """
    role_lower = role.lower()
    if role_lower not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'admin' or 'user'"
        )
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Prevent self-demotion
    if user.id == current_admin.id and role_lower == "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot revoke their own admin privileges."
        )
        
    user.role = role_lower
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
