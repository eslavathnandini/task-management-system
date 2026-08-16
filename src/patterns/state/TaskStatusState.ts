import { TaskStatus, Task } from '../../models/Task';
import { UserRole } from '../../models/User';

export interface ITaskStatusState {
  getStatus(): TaskStatus;
  canTransitionTo(targetStatus: TaskStatus, actorRole: UserRole): boolean;
  getNextAllowedStatuses(actorRole: UserRole): TaskStatus[];
}

export class TodoState implements ITaskStatusState {
  getStatus(): TaskStatus {
    return TaskStatus.TODO;
  }

  canTransitionTo(targetStatus: TaskStatus, actorRole: UserRole): boolean {
    if (actorRole === UserRole.ADMIN) return true;
    return targetStatus === TaskStatus.IN_PROGRESS;
  }

  getNextAllowedStatuses(actorRole: UserRole): TaskStatus[] {
    if (actorRole === UserRole.ADMIN) {
      return [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
    }
    return [TaskStatus.IN_PROGRESS];
  }
}

export class InProgressState implements ITaskStatusState {
  getStatus(): TaskStatus {
    return TaskStatus.IN_PROGRESS;
  }

  canTransitionTo(targetStatus: TaskStatus, actorRole: UserRole): boolean {
    if (actorRole === UserRole.ADMIN) return true;
    return targetStatus === TaskStatus.REVIEW || targetStatus === TaskStatus.TODO;
  }

  getNextAllowedStatuses(actorRole: UserRole): TaskStatus[] {
    if (actorRole === UserRole.ADMIN) {
      return [TaskStatus.TODO, TaskStatus.REVIEW, TaskStatus.DONE];
    }
    return [TaskStatus.TODO, TaskStatus.REVIEW];
  }
}

export class ReviewState implements ITaskStatusState {
  getStatus(): TaskStatus {
    return TaskStatus.REVIEW;
  }

  canTransitionTo(targetStatus: TaskStatus, actorRole: UserRole): boolean {
    if (actorRole === UserRole.ADMIN) return true;
    return targetStatus === TaskStatus.DONE || targetStatus === TaskStatus.IN_PROGRESS;
  }

  getNextAllowedStatuses(actorRole: UserRole): TaskStatus[] {
    if (actorRole === UserRole.ADMIN) {
      return [TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.TODO];
    }
    return [TaskStatus.IN_PROGRESS, TaskStatus.DONE];
  }
}

export class DoneState implements ITaskStatusState {
  getStatus(): TaskStatus {
    return TaskStatus.DONE;
  }

  canTransitionTo(targetStatus: TaskStatus, actorRole: UserRole): boolean {
    // Only ADMIN or MANAGER can reopen a DONE task back to IN_PROGRESS or TODO
    if (actorRole === UserRole.ADMIN || actorRole === UserRole.MANAGER) {
      return targetStatus === TaskStatus.IN_PROGRESS || targetStatus === TaskStatus.TODO;
    }
    return false;
  }

  getNextAllowedStatuses(actorRole: UserRole): TaskStatus[] {
    if (actorRole === UserRole.ADMIN || actorRole === UserRole.MANAGER) {
      return [TaskStatus.TODO, TaskStatus.IN_PROGRESS];
    }
    return [];
  }
}

export class TaskStateFactory {
  static getState(status: TaskStatus): ITaskStatusState {
    switch (status) {
      case TaskStatus.TODO:
        return new TodoState();
      case TaskStatus.IN_PROGRESS:
        return new InProgressState();
      case TaskStatus.REVIEW:
        return new ReviewState();
      case TaskStatus.DONE:
        return new DoneState();
      default:
        throw new Error(`Unknown task status: ${status}`);
    }
  }
}
