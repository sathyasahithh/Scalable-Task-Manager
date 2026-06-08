from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..utils.deps import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    *,
    db: Session = Depends(get_db),
    task_in: schemas.TaskCreate,
    current_user: models.User = Depends(get_current_user)
) -> Any:
    """
    Create new task.
    """
    task = models.Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        owner_id=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/", response_model=List[schemas.TaskResponse])
def read_tasks(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (pending, in_progress, completed)"),
    all_users: bool = Query(False, description="Admin only: Retrieve tasks for all users"),
    current_user: models.User = Depends(get_current_user)
) -> Any:
    """
    Retrieve tasks.
    """
    query = db.query(models.Task)
    
    # Scoping rule:
    # If the user is admin AND they requested all users' tasks, don't filter by owner.
    # Otherwise, filter by current user.
    if current_user.role == "admin" and all_users:
        pass
    else:
        query = query.filter(models.Task.owner_id == current_user.id)
        
    if status_filter:
        query = query.filter(models.Task.status == status_filter.lower())
        
    tasks = query.offset(skip).limit(limit).all()
    return tasks


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def read_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    current_user: models.User = Depends(get_current_user)
) -> Any:
    """
    Get task by ID.
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this task"
        )
        
    return task


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    task_in: schemas.TaskUpdate,
    current_user: models.User = Depends(get_current_user)
) -> Any:
    """
    Update a task.
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to modify this task"
        )
        
    # Update fields
    update_data = task_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(task, field, update_data[field])
        
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    current_user: models.User = Depends(get_current_user)
) -> Any:
    """
    Delete a task.
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
        
    # Check permissions
    if current_user.role != "admin" and task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this task"
        )
        
    db.delete(task)
    db.commit()
    return {"status": "success", "message": "Task deleted successfully"}
