from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    MEMBER = "MEMBER"
    GUEST = "GUEST"


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"


class NotificationEventType(str, Enum):
    TASK_CREATED = "TASK_CREATED"
    TASK_ASSIGNED = "TASK_ASSIGNED"
    STATUS_CHANGED = "STATUS_CHANGED"
    COMMENT_ADDED = "COMMENT_ADDED"
    PRIORITY_CHANGED = "PRIORITY_CHANGED"


@dataclass
class User:
    id: str
    name: str
    email: str
    role: UserRole
    avatar_url: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role.value if isinstance(self.role, Enum) else self.role,
            "avatarUrl": self.avatar_url,
            "createdAt": self.created_at
        }


@dataclass
class Project:
    id: str
    name: str
    key: str
    description: str
    owner_id: str
    member_ids: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "key": self.key,
            "description": self.description,
            "ownerId": self.owner_id,
            "memberIds": self.member_ids,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }


@dataclass
class Comment:
    id: str
    task_id: str
    author_id: str
    author_name: str
    content: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "taskId": self.task_id,
            "authorId": self.author_id,
            "authorName": self.author_name,
            "content": self.content,
            "createdAt": self.created_at
        }


@dataclass
class TaskHistory:
    id: str
    task_id: str
    field_changed: str
    old_value: Optional[str]
    new_value: Optional[str]
    performed_by_user_id: str
    performed_by_user_name: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "taskId": self.task_id,
            "fieldChanged": self.field_changed,
            "oldValue": self.old_value,
            "newValue": self.new_value,
            "performedByUserId": self.performed_by_user_id,
            "performedByUserName": self.performed_by_user_name,
            "timestamp": self.timestamp
        }


@dataclass
class Notification:
    id: str
    recipient_user_id: str
    sender_user_id: str
    task_id: str
    task_title: str
    event_type: NotificationEventType
    message: str
    is_read: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "recipientUserId": self.recipient_user_id,
            "senderUserId": self.sender_user_id,
            "taskId": self.task_id,
            "taskTitle": self.task_title,
            "eventType": self.event_type.value if isinstance(self.event_type, Enum) else self.event_type,
            "message": self.message,
            "isRead": self.is_read,
            "timestamp": self.timestamp
        }


@dataclass
class Task:
    id: str
    project_id: str
    task_key: str
    title: str
    description: str
    priority: TaskPriority
    status: TaskStatus
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    reporter_id: str = ""
    reporter_name: str = ""
    deadline: Optional[str] = None
    comments: List[Comment] = field(default_factory=list)
    history: List[TaskHistory] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "projectId": self.project_id,
            "taskKey": self.task_key,
            "title": self.title,
            "description": self.description,
            "priority": self.priority.value if isinstance(self.priority, Enum) else self.priority,
            "status": self.status.value if isinstance(self.status, Enum) else self.status,
            "assigneeId": self.assignee_id,
            "assigneeName": self.assignee_name,
            "reporterId": self.reporter_id,
            "reporterName": self.reporter_name,
            "deadline": self.deadline,
            "comments": [c.to_dict() for c in self.comments],
            "history": [h.to_dict() for h in self.history],
            "tags": self.tags,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }
