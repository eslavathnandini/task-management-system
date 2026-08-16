from enum import Enum
from typing import Optional
from models import User, UserRole, Task


class ActionPermission(str, Enum):
    CREATE_PROJECT = "CREATE_PROJECT"
    DELETE_PROJECT = "DELETE_PROJECT"
    CREATE_TASK = "CREATE_TASK"
    UPDATE_TASK = "UPDATE_TASK"
    DELETE_TASK = "DELETE_TASK"
    ASSIGN_TASK = "ASSIGN_TASK"
    TRANSITION_STATUS = "TRANSITION_STATUS"
    ADD_COMMENT = "ADD_COMMENT"
    VIEW_TASK = "VIEW_TASK"


class PermissionEvaluator:
    @staticmethod
    def can(user: User, action: ActionPermission, task: Optional[Task] = None) -> bool:
        if not user:
            return False

        # ADMIN has full privileges
        if user.role == UserRole.ADMIN:
            return True

        # GUEST can only VIEW
        if user.role == UserRole.GUEST:
            return action == ActionPermission.VIEW_TASK

        if action == ActionPermission.CREATE_PROJECT:
            return user.role in [UserRole.MANAGER, UserRole.ADMIN]

        if action == ActionPermission.DELETE_PROJECT:
            return user.role == UserRole.ADMIN

        if action in [ActionPermission.CREATE_TASK, ActionPermission.ADD_COMMENT, ActionPermission.VIEW_TASK]:
            return user.role in [UserRole.MANAGER, UserRole.MEMBER]

        if action in [ActionPermission.ASSIGN_TASK, ActionPermission.TRANSITION_STATUS, ActionPermission.UPDATE_TASK]:
            if user.role == UserRole.MANAGER:
                return True
            if user.role == UserRole.MEMBER:
                if task is None:
                    return True
                return (
                    task.assignee_id == user.id or
                    task.reporter_id == user.id or
                    not task.assignee_id
                )
            return False

        if action == ActionPermission.DELETE_TASK:
            return user.role in [UserRole.MANAGER, UserRole.ADMIN]

        return False

    @classmethod
    def enforce(cls, user: User, action: ActionPermission, task: Optional[Task] = None) -> None:
        if not cls.can(user, action, task):
            raise PermissionError(
                f"Forbidden: User '{user.name}' ({user.role}) is not authorized for action '{action}'"
            )
