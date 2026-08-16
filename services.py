import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from models import (
    User, UserRole, Project, Task, Comment, TaskHistory, Notification,
    TaskPriority, TaskStatus, NotificationEventType
)
from repository import InMemoryRepository
from patterns.state import TaskStateFactory
from patterns.strategy import (
    CompositeFilterStrategy, StatusFilterStrategy, PriorityFilterStrategy,
    AssigneeFilterStrategy, KeywordSearchStrategy
)
from patterns.observer import NotificationPublisher, TaskObserver, TaskEventPayload
from patterns.rbac import PermissionEvaluator, ActionPermission


class UserService:
    def __init__(self, user_repo: Optional[InMemoryRepository[User]] = None):
        self.user_repo = user_repo or InMemoryRepository[User](
            filename="users.json",
            serializer=lambda u: u.to_dict(),
            deserializer=lambda d: User(
                id=d["id"], name=d["name"], email=d["email"],
                role=UserRole(d["role"]), avatar_url=d.get("avatarUrl"),
                created_at=d.get("createdAt", datetime.now().isoformat())
            )
        )
        self.seed_default_users()

    def seed_default_users(self):
        if len(self.user_repo.find_all()) == 0:
            now = datetime.now().isoformat()
            default_users = [
                User(id="user-admin-1", name="Sarah Connor (Admin)", email="admin@trello.io", role=UserRole.ADMIN, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", created_at=now),
                User(id="user-mgr-1", name="Alex Rivera (Manager)", email="alex.mgr@trello.io", role=UserRole.MANAGER, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", created_at=now),
                User(id="user-dev-1", name="David Kim (Developer)", email="david.dev@trello.io", role=UserRole.MEMBER, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=David", created_at=now),
                User(id="user-dev-2", name="Elena Rostova (Designer)", email="elena.design@trello.io", role=UserRole.MEMBER, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Elena", created_at=now),
                User(id="user-guest-1", name="Guest Viewer", email="guest@trello.io", role=UserRole.GUEST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Guest", created_at=now)
            ]
            for u in default_users:
                self.user_repo.save(u)

    def create_user(self, name: str, email: str, role: UserRole) -> User:
        user = User(
            id=f"user-{uuid.uuid4().hex[:8]}",
            name=name,
            email=email,
            role=role,
            avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={name}"
        )
        return self.user_repo.save(user)

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self.user_repo.find_by_id(user_id)

    def get_all_users(self) -> List[User]:
        return self.user_repo.find_all()

    def update_user_role(self, user_id: str, role: UserRole) -> User:
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        user.role = role
        return self.user_repo.save(user)


class ProjectService:
    def __init__(self, project_repo: Optional[InMemoryRepository[Project]] = None):
        self.project_repo = project_repo or InMemoryRepository[Project](
            filename="projects.json",
            serializer=lambda p: p.to_dict(),
            deserializer=lambda d: Project(
                id=d["id"], name=d["name"], key=d["key"], description=d["description"],
                owner_id=d["ownerId"], member_ids=d.get("memberIds", []),
                created_at=d.get("createdAt", datetime.now().isoformat()),
                updated_at=d.get("updatedAt", datetime.now().isoformat())
            )
        )
        self.seed_default_project()

    def seed_default_project(self):
        if len(self.project_repo.find_all()) == 0:
            now = datetime.now().isoformat()
            default_proj = Project(
                id="proj-core-1",
                name="Sprint Alpha - Engineering Board",
                key="ALPHA",
                description="Core Engineering Sprint Board for Mini Jira / Trello LLD",
                owner_id="user-mgr-1",
                member_ids=["user-admin-1", "user-mgr-1", "user-dev-1", "user-dev-2", "user-guest-1"],
                created_at=now,
                updated_at=now
            )
            self.project_repo.save(default_proj)

    def create_project(self, name: str, key: str, description: str, owner_id: str) -> Project:
        now = datetime.now().isoformat()
        proj = Project(
            id=f"proj-{uuid.uuid4().hex[:8]}",
            name=name,
            key=key.upper(),
            description=description,
            owner_id=owner_id,
            member_ids=[owner_id],
            created_at=now,
            updated_at=now
        )
        return self.project_repo.save(proj)

    def get_project_by_id(self, project_id: str) -> Optional[Project]:
        return self.project_repo.find_by_id(project_id)

    def get_all_projects(self) -> List[Project]:
        return self.project_repo.find_all()


class NotificationService(TaskObserver):
    def __init__(self, notification_repo: Optional[InMemoryRepository[Notification]] = None):
        self.notification_repo = notification_repo or InMemoryRepository[Notification](
            filename="notifications.json",
            serializer=lambda n: n.to_dict(),
            deserializer=lambda d: Notification(
                id=d["id"], recipient_user_id=d["recipientUserId"],
                sender_user_id=d["senderUserId"], task_id=d["taskId"],
                task_title=d["taskTitle"], event_type=NotificationEventType(d["eventType"]),
                message=d["message"], is_read=d.get("isRead", False),
                timestamp=d.get("timestamp", datetime.now().isoformat())
            )
        )
        NotificationPublisher().subscribe(self)

    def on_task_event(self, payload: TaskEventPayload) -> None:
        target_user_id = payload.recipient_user_id or payload.task.assignee_id or payload.task.reporter_id
        if target_user_id and target_user_id != payload.actor_user_id:
            notif = Notification(
                id=f"notif-{uuid.uuid4().hex[:8]}",
                recipient_user_id=target_user_id,
                sender_user_id=payload.actor_user_id,
                task_id=payload.task.id,
                task_title=payload.task.title,
                event_type=payload.event_type,
                message=payload.message,
                is_read=False,
                timestamp=payload.timestamp or datetime.now().isoformat()
            )
            self.notification_repo.save(notif)

    def get_user_notifications(self, user_id: str) -> List[Notification]:
        notifs = self.notification_repo.query(lambda n: n.recipient_user_id == user_id)
        return sorted(notifs, key=lambda n: n.timestamp, reverse=True)

    def mark_as_read(self, notification_id: str) -> Notification:
        notif = self.notification_repo.find_by_id(notification_id)
        if not notif:
            raise ValueError("Notification not found")
        notif.is_read = True
        return self.notification_repo.save(notif)


class SearchService:
    def search_tasks(self, tasks: List[Task], status: Optional[TaskStatus] = None, priority: Optional[TaskPriority] = None, assignee_id: Optional[str] = None, query: Optional[str] = None) -> List[Task]:
        composite = CompositeFilterStrategy()
        if status:
            composite.add_strategy(StatusFilterStrategy(status))
        if priority:
            composite.add_strategy(PriorityFilterStrategy(priority))
        if assignee_id:
            composite.add_strategy(AssigneeFilterStrategy(assignee_id))
        if query:
            composite.add_strategy(KeywordSearchStrategy(query))
        return composite.filter(tasks)


class TaskService:
    def __init__(self, task_repo: Optional[InMemoryRepository[Task]] = None, user_service: Optional[UserService] = None):
        self.user_service = user_service
        self.task_repo = task_repo or InMemoryRepository[Task](
            filename="tasks.json",
            serializer=lambda t: t.to_dict(),
            deserializer=self._deserialize_task
        )
        self.seed_default_tasks()

    def _deserialize_task(self, d: dict) -> Task:
        comments = [
            Comment(
                id=c["id"], task_id=c["taskId"], author_id=c["authorId"],
                author_name=c["authorName"], content=c["content"],
                created_at=c.get("createdAt", datetime.now().isoformat())
            ) for c in d.get("comments", [])
        ]
        history = [
            TaskHistory(
                id=h["id"], task_id=h["taskId"], field_changed=h["fieldChanged"],
                old_value=h.get("oldValue"), new_value=h.get("newValue"),
                performed_by_user_id=h["performedByUserId"],
                performed_by_user_name=h["performedByUserName"],
                timestamp=h.get("timestamp", datetime.now().isoformat())
            ) for h in d.get("history", [])
        ]
        return Task(
            id=d["id"], project_id=d["projectId"], task_key=d["taskKey"],
            title=d["title"], description=d.get("description", ""),
            priority=TaskPriority(d["priority"]), status=TaskStatus(d["status"]),
            assignee_id=d.get("assigneeId"), assignee_name=d.get("assigneeName"),
            reporter_id=d.get("reporterId", ""), reporter_name=d.get("reporterName", ""),
            deadline=d.get("deadline"), comments=comments, history=history,
            tags=d.get("tags", []), created_at=d.get("createdAt", datetime.now().isoformat()),
            updated_at=d.get("updatedAt", datetime.now().isoformat())
        )

    def seed_default_tasks(self):
        if len(self.task_repo.find_all()) == 0:
            now = datetime.now().isoformat()
            three_days_later = (datetime.now() + timedelta(days=3)).isoformat()
            five_days_later = (datetime.now() + timedelta(days=5)).isoformat()

            sample_tasks = [
                Task(
                    id="task-101", project_id="proj-core-1", task_key="ALPHA-101",
                    title="Implement In-Memory Cache with LRU Strategy",
                    description="Design and implement thread-safe LRU eviction strategy for LLD project.",
                    priority=TaskPriority.HIGH, status=TaskStatus.IN_PROGRESS,
                    assignee_id="user-dev-1", assignee_name="David Kim (Developer)",
                    reporter_id="user-mgr-1", reporter_name="Alex Rivera (Manager)",
                    deadline=three_days_later,
                    comments=[
                        Comment(id="comment-1", task_id="task-101", author_id="user-mgr-1", author_name="Alex Rivera (Manager)", content="Please ensure ReadWriteLocks are used for concurrency.", created_at=now)
                    ],
                    history=[
                        TaskHistory(id="hist-1", task_id="task-101", field_changed="status", old_value="TODO", new_value="IN_PROGRESS", performed_by_user_id="user-dev-1", performed_by_user_name="David Kim (Developer)", timestamp=now)
                    ],
                    tags=["Backend", "LLD", "Cache"], created_at=now, updated_at=now
                ),
                Task(
                    id="task-102", project_id="proj-core-1", task_key="ALPHA-102",
                    title="Design UI Wireframes for Kanban Board",
                    description="Create responsive glassmorphic cards and modal designs.",
                    priority=TaskPriority.MEDIUM, status=TaskStatus.TODO,
                    assignee_id="user-dev-2", assignee_name="Elena Rostova (Designer)",
                    reporter_id="user-mgr-1", reporter_name="Alex Rivera (Manager)",
                    deadline=five_days_later, comments=[], history=[],
                    tags=["UI/UX", "Design"], created_at=now, updated_at=now
                ),
                Task(
                    id="task-103", project_id="proj-core-1", task_key="ALPHA-103",
                    title="Setup RBAC Permission Middleware",
                    description="Implement Chain of Responsibility evaluator for ADMIN/MANAGER/MEMBER access rules.",
                    priority=TaskPriority.URGENT, status=TaskStatus.REVIEW,
                    assignee_id="user-admin-1", assignee_name="Sarah Connor (Admin)",
                    reporter_id="user-admin-1", reporter_name="Sarah Connor (Admin)",
                    deadline=three_days_later, comments=[], history=[],
                    tags=["Security", "RBAC"], created_at=now, updated_at=now
                )
            ]
            for t in sample_tasks:
                self.task_repo.save(t)

    def create_task(self, actor: User, project_id: str, title: str, description: str = "", priority: TaskPriority = TaskPriority.MEDIUM, assignee_id: Optional[str] = None, deadline: Optional[str] = None, tags: Optional[List[str]] = None) -> Task:
        PermissionEvaluator.enforce(actor, ActionPermission.CREATE_TASK)
        now = datetime.now().isoformat()
        count = len(self.task_repo.find_all()) + 101
        task_key = f"ALPHA-{count}"

        assignee_name = None
        if assignee_id and self.user_service:
            assignee_user = self.user_service.get_user_by_id(assignee_id)
            if assignee_user:
                assignee_name = assignee_user.name

        task = Task(
            id=f"task-{uuid.uuid4().hex[:8]}",
            project_id=project_id,
            task_key=task_key,
            title=title,
            description=description,
            priority=priority,
            status=TaskStatus.TODO,
            assignee_id=assignee_id,
            assignee_name=assignee_name,
            reporter_id=actor.id,
            reporter_name=actor.name,
            deadline=deadline,
            comments=[],
            history=[],
            tags=tags or [],
            created_at=now,
            updated_at=now
        )

        hist = TaskHistory(
            id=f"hist-{uuid.uuid4().hex[:8]}",
            task_id=task.id,
            field_changed="created",
            old_value=None,
            new_value="TODO",
            performed_by_user_id=actor.id,
            performed_by_user_name=actor.name,
            timestamp=now
        )
        task.history.append(hist)

        saved = self.task_repo.save(task)

        NotificationPublisher().notify(TaskEventPayload(
            event_type=NotificationEventType.TASK_CREATED,
            task=saved,
            actor_user_id=actor.id,
            actor_user_name=actor.name,
            recipient_user_id=saved.assignee_id,
            message=f"{actor.name} created task '{saved.task_key}: {saved.title}'",
            timestamp=now
        ))

        return saved

    def update_task_status(self, actor: User, task_id: str, new_status: TaskStatus) -> Task:
        task = self.get_task_by_id(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        PermissionEvaluator.enforce(actor, ActionPermission.TRANSITION_STATUS, task)

        # State Pattern Guard Check
        state_handler = TaskStateFactory.get_state(task.status)
        if not state_handler.can_transition_to(new_status, actor.role):
            raise ValueError(
                f"Invalid Status Transition: Cannot transition task from '{task.status.value if hasattr(task.status, 'value') else task.status}' to '{new_status.value if hasattr(new_status, 'value') else new_status}' for role '{actor.role.value if hasattr(actor.role, 'value') else actor.role}'"
            )

        old_status = task.status.value if hasattr(task.status, 'value') else str(task.status)
        task.status = new_status
        now = datetime.now().isoformat()
        task.updated_at = now

        hist = TaskHistory(
            id=f"hist-{uuid.uuid4().hex[:8]}",
            task_id=task.id,
            field_changed="status",
            old_value=old_status,
            new_value=new_status.value if hasattr(new_status, 'value') else str(new_status),
            performed_by_user_id=actor.id,
            performed_by_user_name=actor.name,
            timestamp=now
        )
        task.history.append(hist)

        saved = self.task_repo.save(task)

        NotificationPublisher().notify(TaskEventPayload(
            event_type=NotificationEventType.STATUS_CHANGED,
            task=saved,
            actor_user_id=actor.id,
            actor_user_name=actor.name,
            field_changed="status",
            old_value=old_status,
            new_value=saved.status.value if hasattr(saved.status, 'value') else str(saved.status),
            message=f"{actor.name} changed status of '{task.task_key}' from {old_status} to {saved.status.value if hasattr(saved.status, 'value') else str(saved.status)}",
            timestamp=now
        ))

        return saved

    def assign_task(self, actor: User, task_id: str, assignee_id: Optional[str]) -> Task:
        task = self.get_task_by_id(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        PermissionEvaluator.enforce(actor, ActionPermission.ASSIGN_TASK, task)

        old_assignee = task.assignee_id
        new_assignee_name = None
        if assignee_id and self.user_service:
            u = self.user_service.get_user_by_id(assignee_id)
            if u:
                new_assignee_name = u.name

        task.assignee_id = assignee_id
        task.assignee_name = new_assignee_name
        now = datetime.now().isoformat()
        task.updated_at = now

        hist = TaskHistory(
            id=f"hist-{uuid.uuid4().hex[:8]}",
            task_id=task.id,
            field_changed="assignee",
            old_value=old_assignee,
            new_value=assignee_id,
            performed_by_user_id=actor.id,
            performed_by_user_name=actor.name,
            timestamp=now
        )
        task.history.append(hist)

        saved = self.task_repo.save(task)

        NotificationPublisher().notify(TaskEventPayload(
            event_type=NotificationEventType.TASK_ASSIGNED,
            task=saved,
            actor_user_id=actor.id,
            actor_user_name=actor.name,
            recipient_user_id=assignee_id,
            message=f"{actor.name} assigned '{task.task_key}: {task.title}' to {new_assignee_name or assignee_id}",
            timestamp=now
        ))

        return saved

    def add_comment(self, actor: User, task_id: str, content: str) -> Comment:
        task = self.get_task_by_id(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        PermissionEvaluator.enforce(actor, ActionPermission.ADD_COMMENT, task)

        now = datetime.now().isoformat()
        comment = Comment(
            id=f"comment-{uuid.uuid4().hex[:8]}",
            task_id=task.id,
            author_id=actor.id,
            author_name=actor.name,
            content=content,
            created_at=now
        )
        task.comments.append(comment)
        task.updated_at = now
        self.task_repo.save(task)

        NotificationPublisher().notify(TaskEventPayload(
            event_type=NotificationEventType.COMMENT_ADDED,
            task=task,
            actor_user_id=actor.id,
            actor_user_name=actor.name,
            message=f"{actor.name} commented on '{task.task_key}': \"{content[:40]}\"",
            timestamp=now
        ))

        return comment

    def get_task_by_id(self, task_id: str) -> Optional[Task]:
        return self.task_repo.find_by_id(task_id)

    def get_all_tasks(self) -> List[Task]:
        return self.task_repo.find_all()

    def delete_task(self, actor: User, task_id: str) -> bool:
        task = self.get_task_by_id(task_id)
        if not task:
            return False
        PermissionEvaluator.enforce(actor, ActionPermission.DELETE_TASK, task)
        return self.task_repo.delete(task_id)
