from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WorkEvidenceResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    file_url: str
    uploaded_at: datetime