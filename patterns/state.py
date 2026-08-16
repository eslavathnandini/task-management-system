from abc import ABC, abstractmethod
from typing import List
from models import TaskStatus, UserRole


class TaskStatusState(ABC):
    @abstractmethod
    def get_status(self) -> TaskStatus:
        pass

    @abstractmethod
    def can_transition_to(self, target_status: TaskStatus, actor_role: UserRole) -> bool:
        pass

    @abstractmethod
    def get_next_allowed_statuses(self, actor_role: UserRole) -> List[TaskStatus]:
        pass


class TodoState(TaskStatusState):
    def get_status(self) -> TaskStatus:
        return TaskStatus.TODO

    def can_transition_to(self, target_status: TaskStatus, actor_role: UserRole) -> bool:
        if actor_role == UserRole.ADMIN:
            return True
        return target_status == TaskStatus.IN_PROGRESS

    def get_next_allowed_statuses(self, actor_role: UserRole) -> List[TaskStatus]:
        if actor_role == UserRole.ADMIN:
            return [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE]
        return [TaskStatus.IN_PROGRESS]


class InProgressState(TaskStatusState):
    def get_status(self) -> TaskStatus:
        return TaskStatus.IN_PROGRESS

    def can_transition_to(self, target_status: TaskStatus, actor_role: UserRole) -> bool:
        if actor_role == UserRole.ADMIN:
            return True
        return target_status in [TaskStatus.REVIEW, TaskStatus.TODO]

    def get_next_allowed_statuses(self, actor_role: UserRole) -> List[TaskStatus]:
        if actor_role == UserRole.ADMIN:
            return [TaskStatus.TODO, TaskStatus.REVIEW, TaskStatus.DONE]
        return [TaskStatus.TODO, TaskStatus.REVIEW]


class ReviewState(TaskStatusState):
    def get_status(self) -> TaskStatus:
        return TaskStatus.REVIEW

    def can_transition_to(self, target_status: TaskStatus, actor_role: UserRole) -> bool:
        if actor_role == UserRole.ADMIN:
            return True
        return target_status in [TaskStatus.DONE, TaskStatus.IN_PROGRESS]

    def get_next_allowed_statuses(self, actor_role: UserRole) -> List[TaskStatus]:
        if actor_role == UserRole.ADMIN:
            return [TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.TODO]
        return [TaskStatus.IN_PROGRESS, TaskStatus.DONE]


class DoneState(TaskStatusState):
    def get_status(self) -> TaskStatus:
        return TaskStatus.DONE

    def can_transition_to(self, target_status: TaskStatus, actor_role: UserRole) -> bool:
        # Only ADMIN or MANAGER can reopen a DONE task
        if actor_role in [UserRole.ADMIN, UserRole.MANAGER]:
            return target_status in [TaskStatus.IN_PROGRESS, TaskStatus.TODO]
        return False

    def get_next_allowed_statuses(self, actor_role: UserRole) -> List[TaskStatus]:
        if actor_role in [UserRole.ADMIN, UserRole.MANAGER]:
            return [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        return []


class TaskStateFactory:
    @staticmethod
    def get_state(status: TaskStatus) -> TaskStatusState:
        if status == TaskStatus.TODO:
            return TodoState()
        elif status == TaskStatus.IN_PROGRESS:
            return InProgressState()
        elif status == TaskStatus.REVIEW:
            return ReviewState()
        elif status == TaskStatus.DONE:
            return DoneState()
        else:
            raise ValueError(f"Unknown task status: {status}")
