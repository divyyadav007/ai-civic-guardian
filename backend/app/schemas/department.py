from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class DepartmentBase(BaseModel):
    name: str
    routing_keys: List[str] = []


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    routing_keys: Optional[List[str]] = None
