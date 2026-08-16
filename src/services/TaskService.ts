import { InMemoryRepository } from '../repository/InMemoryRepository';
import { Task, TaskPriority, TaskStatus } from '../models/Task';
import { Comment } from '../models/Comment';
import { TaskHistory } from '../models/TaskHistory';
import { User, UserRole } from '../models/User';
import { TaskStateFactory } from '../patterns/state/TaskStatusState';
import { PermissionEvaluator, ActionPermission } from '../patterns/rbac/PermissionEvaluator';
import { NotificationPublisher } from '../patterns/observer/NotificationPublisher';
import { NotificationEventType } from '../models/Notification';
import { UserService } from './UserService';

export interface CreateTaskDTO {
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId?: string | null;
  deadline?: string | null;
  tags?: string[];
}

export class TaskService {
  private taskRepo: InMemoryRepository<Task>;

  constructor(
    taskRepo?: InMemoryRepository<Task>,
    private userService?: UserService
  ) {
    this.taskRepo = taskRepo || new InMemoryRepository<Task>('tasks.json');
    this.seedDefaultTasks();
  }

  private seedDefaultTasks(): void {
    if (this.taskRepo.findAll().length === 0) {
      const now = new Date().toISOString();

      const sampleTasks: Task[] = [
        {
          id: 'task-101',
          projectId: 'proj-core-1',
          taskKey: 'ALPHA-101',
          title: 'Implement In-Memory Cache with LRU Strategy',
          description: 'Design and implement thread-safe LRU eviction strategy for LLD project.',
          priority: TaskPriority.HIGH,
          status: TaskStatus.IN_PROGRESS,
          assigneeId: 'user-dev-1',
          assigneeName: 'David Kim (Developer)',
          reporterId: 'user-mgr-1',
          reporterName: 'Alex Rivera (Manager)',
          deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
          comments: [
            {
              id: 'comment-1',
              taskId: 'task-101',
              authorId: 'user-mgr-1',
              authorName: 'Alex Rivera (Manager)',
              content: 'Please ensure ReadWriteLocks are used for concurrency.',
              createdAt: now
            }
          ],
          history: [
            {
              id: 'hist-1',
              taskId: 'task-101',
              fieldChanged: 'status',
              oldValue: 'TODO',
              newValue: 'IN_PROGRESS',
              performedByUserId: 'user-dev-1',
              performedByUserName: 'David Kim (Developer)',
              timestamp: now
            }
          ],
          tags: ['Backend', 'LLD', 'Cache'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'task-102',
          projectId: 'proj-core-1',
          taskKey: 'ALPHA-102',
          title: 'Design UI Wireframes for Kanban Board',
          description: 'Create responsive glassmorphic cards and modal designs.',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          assigneeId: 'user-dev-2',
          assigneeName: 'Elena Rostova (Designer)',
          reporterId: 'user-mgr-1',
          reporterName: 'Alex Rivera (Manager)',
          deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
          comments: [],
          history: [],
          tags: ['UI/UX', 'Design'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'task-103',
          projectId: 'proj-core-1',
          taskKey: 'ALPHA-103',
          title: 'Setup RBAC Permission Middleware',
          description: 'Implement Chain of Responsibility evaluator for ADMIN/MANAGER/MEMBER access rules.',
          priority: TaskPriority.URGENT,
          status: TaskStatus.REVIEW,
          assigneeId: 'user-admin-1',
          assigneeName: 'Sarah Connor (Admin)',
          reporterId: 'user-admin-1',
          reporterName: 'Sarah Connor (Admin)',
          deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
          comments: [],
          history: [],
          tags: ['Security', 'RBAC'],
          createdAt: now,
          updatedAt: now
        }
      ];

      for (const t of sampleTasks) {
        this.taskRepo.save(t);
      }
    }
  }

  public createTask(actor: User, dto: CreateTaskDTO): Task {
    PermissionEvaluator.enforce(actor, ActionPermission.CREATE_TASK);

    const now = new Date().toISOString();
    const taskCount = this.taskRepo.findAll().length + 101;
    const taskKey = `ALPHA-${taskCount}`;

    let assigneeName: string | undefined;
    if (dto.assigneeId && this.userService) {
      const assigneeUser = this.userService.getUserById(dto.assigneeId);
      if (assigneeUser) assigneeName = assigneeUser.name;
    }

    const task: Task = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: dto.projectId,
      taskKey,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      status: TaskStatus.TODO,
      assigneeId: dto.assigneeId || null,
      assigneeName: assigneeName || null,
      reporterId: actor.id,
      reporterName: actor.name,
      deadline: dto.deadline || null,
      comments: [],
      history: [],
      tags: dto.tags || [],
      createdAt: now,
      updatedAt: now
    };

    // Log history
    const historyEntry: TaskHistory = {
      id: `hist-${Date.now()}`,
      taskId: task.id,
      fieldChanged: 'created',
      oldValue: null,
      newValue: 'TODO',
      performedByUserId: actor.id,
      performedByUserName: actor.name,
      timestamp: now
    };
    task.history.push(historyEntry);

    const savedTask = this.taskRepo.save(task);

    // Observer event notification
    NotificationPublisher.getInstance().notify({
      eventType: NotificationEventType.TASK_CREATED,
      task: savedTask,
      actorUserId: actor.id,
      actorUserName: actor.name,
      recipientUserId: task.assigneeId || undefined,
      message: `${actor.name} created task '${task.taskKey}: ${task.title}'`,
      timestamp: now
    });

    return savedTask;
  }

  public updateTaskStatus(actor: User, taskId: string, newStatus: TaskStatus): Task {
    const task = this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found.`);

    PermissionEvaluator.enforce(actor, ActionPermission.TRANSITION_STATUS, task);

    // State Pattern Validation
    const currentStateHandler = TaskStateFactory.getState(task.status);
    if (!currentStateHandler.canTransitionTo(newStatus, actor.role)) {
      throw new Error(
        `Invalid Status Transition: Cannot transition task from '${task.status}' to '${newStatus}' for role '${actor.role}'`
      );
    }

    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();

    // Record Audit History
    const historyEntry: TaskHistory = {
      id: `hist-${Date.now()}`,
      taskId: task.id,
      fieldChanged: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      performedByUserId: actor.id,
      performedByUserName: actor.name,
      timestamp: task.updatedAt
    };
    task.history.push(historyEntry);

    const updatedTask = this.taskRepo.save(task);

    // Observer notification
    NotificationPublisher.getInstance().notify({
      eventType: NotificationEventType.STATUS_CHANGED,
      task: updatedTask,
      actorUserId: actor.id,
      actorUserName: actor.name,
      fieldChanged: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      message: `${actor.name} changed status of '${task.taskKey}' from ${oldStatus} to ${newStatus}`,
      timestamp: task.updatedAt
    });

    return updatedTask;
  }

  public assignTask(actor: User, taskId: string, assigneeId: string | null): Task {
    const task = this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found.`);

    PermissionEvaluator.enforce(actor, ActionPermission.ASSIGN_TASK, task);

    const oldAssigneeId = task.assigneeId;
    let newAssigneeName: string | null = null;

    if (assigneeId && this.userService) {
      const assigneeUser = this.userService.getUserById(assigneeId);
      if (assigneeUser) newAssigneeName = assigneeUser.name;
    }

    task.assigneeId = assigneeId;
    task.assigneeName = newAssigneeName;
    task.updatedAt = new Date().toISOString();

    const historyEntry: TaskHistory = {
      id: `hist-${Date.now()}`,
      taskId: task.id,
      fieldChanged: 'assignee',
      oldValue: oldAssigneeId,
      newValue: assigneeId,
      performedByUserId: actor.id,
      performedByUserName: actor.name,
      timestamp: task.updatedAt
    };
    task.history.push(historyEntry);

    const updatedTask = this.taskRepo.save(task);

    NotificationPublisher.getInstance().notify({
      eventType: NotificationEventType.TASK_ASSIGNED,
      task: updatedTask,
      actorUserId: actor.id,
      actorUserName: actor.name,
      recipientUserId: assigneeId || undefined,
      fieldChanged: 'assignee',
      oldValue: oldAssigneeId,
      newValue: assigneeId,
      message: assigneeId
        ? `${actor.name} assigned '${task.taskKey}: ${task.title}' to ${newAssigneeName || assigneeId}`
        : `${actor.name} unassigned '${task.taskKey}'`,
      timestamp: task.updatedAt
    });

    return updatedTask;
  }

  public updatePriority(actor: User, taskId: string, priority: TaskPriority): Task {
    const task = this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found.`);

    PermissionEvaluator.enforce(actor, ActionPermission.UPDATE_TASK, task);

    const oldPriority = task.priority;
    task.priority = priority;
    task.updatedAt = new Date().toISOString();

    const historyEntry: TaskHistory = {
      id: `hist-${Date.now()}`,
      taskId: task.id,
      fieldChanged: 'priority',
      oldValue: oldPriority,
      newValue: priority,
      performedByUserId: actor.id,
      performedByUserName: actor.name,
      timestamp: task.updatedAt
    };
    task.history.push(historyEntry);

    const updatedTask = this.taskRepo.save(task);

    NotificationPublisher.getInstance().notify({
      eventType: NotificationEventType.PRIORITY_CHANGED,
      task: updatedTask,
      actorUserId: actor.id,
      actorUserName: actor.name,
      fieldChanged: 'priority',
      oldValue: oldPriority,
      newValue: priority,
      message: `${actor.name} updated priority of '${task.taskKey}' to ${priority}`,
      timestamp: task.updatedAt
    });

    return updatedTask;
  }

  public addComment(actor: User, taskId: string, content: string): Comment {
    const task = this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found.`);

    PermissionEvaluator.enforce(actor, ActionPermission.ADD_COMMENT, task);

    const now = new Date().toISOString();
    const comment: Comment = {
      id: `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId: task.id,
      authorId: actor.id,
      authorName: actor.name,
      content,
      createdAt: now
    };

    task.comments.push(comment);
    task.updatedAt = now;
    this.taskRepo.save(task);

    NotificationPublisher.getInstance().notify({
      eventType: NotificationEventType.COMMENT_ADDED,
      task,
      actorUserId: actor.id,
      actorUserName: actor.name,
      message: `${actor.name} commented on '${task.taskKey}': "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`,
      timestamp: now
    });

    return comment;
  }

  public getTaskById(taskId: string): Task | null {
    return this.taskRepo.findById(taskId);
  }

  public getAllTasks(): Task[] {
    return this.taskRepo.findAll();
  }

  public deleteTask(actor: User, taskId: string): boolean {
    const task = this.getTaskById(taskId);
    if (!task) return false;

    PermissionEvaluator.enforce(actor, ActionPermission.DELETE_TASK, task);
    return this.taskRepo.delete(taskId);
  }
}
