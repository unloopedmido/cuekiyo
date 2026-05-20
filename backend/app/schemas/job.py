from datetime import datetime

from pydantic import BaseModel

from app.enums import JobStatus, JobType


class JobOut(BaseModel):
    id: str
    project_id: str
    type: JobType
    status: JobStatus
    progress: float
    current_step: str | None
    error_message: str | None
    retry_count: int
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class JobLogOut(BaseModel):
    id: str
    job_id: str
    level: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProgressEvent(BaseModel):
    type: str = "job.progress"
    projectId: str
    jobId: str
    stage: str
    progress: float
    message: str
