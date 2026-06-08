from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class TaskStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ALL = [PENDING, IN_PROGRESS, COMPLETED]

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="Task title cannot be empty")
    description: Optional[str] = None
    status: str = Field(default=TaskStatus.PENDING, description="Status must be pending, in_progress, or completed")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_lower = v.lower()
        if v_lower not in TaskStatus.ALL:
            raise ValueError(f"Status must be one of: {', '.join(TaskStatus.ALL)}")
        return v_lower

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_lower = v.lower()
        if v_lower not in TaskStatus.ALL:
            raise ValueError(f"Status must be one of: {', '.join(TaskStatus.ALL)}")
        return v_lower

class TaskResponse(TaskBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
