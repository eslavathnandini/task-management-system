import { User, UserRole } from '../../models/User';
import { Task } from '../../models/Task';

export enum ActionPermission {
  CREATE_PROJECT = 'CREATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_TASK = 'UPDATE_TASK',
  DELETE_TASK = 'DELETE_TASK',
  ASSIGN_TASK = 'ASSIGN_TASK',
  TRANSITION_STATUS = 'TRANSITION_STATUS',
  ADD_COMMENT = 'ADD_COMMENT',
  VIEW_TASK = 'VIEW_TASK'
}

export class PermissionEvaluator {
  public static can(user: User, action: ActionPermission, task?: Task): boolean {
    if (!user) return false;

    // ADMIN has full system privileges
    if (user.role === UserRole.ADMIN) return true;

    // GUEST can only VIEW tasks
    if (user.role === UserRole.GUEST) {
      return action === ActionPermission.VIEW_TASK;
    }

    switch (action) {
      case ActionPermission.CREATE_PROJECT:
        return user.role === UserRole.MANAGER || user.role === UserRole.ADMIN;

      case ActionPermission.DELETE_PROJECT:
        return user.role === UserRole.ADMIN;

      case ActionPermission.CREATE_TASK:
      case ActionPermission.ADD_COMMENT:
      case ActionPermission.VIEW_TASK:
        return user.role === UserRole.MANAGER || user.role === UserRole.MEMBER;

      case ActionPermission.ASSIGN_TASK:
      case ActionPermission.TRANSITION_STATUS:
      case ActionPermission.UPDATE_TASK:
        if (user.role === UserRole.MANAGER) return true;
        if (user.role === UserRole.MEMBER) {
          // MEMBER can modify task if they are assignee, reporter, or if unassigned
          if (!task) return true;
          return (
            task.assigneeId === user.id ||
            task.reporterId === user.id ||
            !task.assigneeId
          );
        }
        return false;

      case ActionPermission.DELETE_TASK:
        return user.role === UserRole.MANAGER || user.role === UserRole.ADMIN;

      default:
        return false;
    }
  }

  public static enforce(user: User, action: ActionPermission, task?: Task): void {
    if (!this.can(user, action, task)) {
      throw new Error(
        `Forbidden: User '${user.name}' (${user.role}) is not authorized to perform action '${action}'`
      );
    }
  }
}
