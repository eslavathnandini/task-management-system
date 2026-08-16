import { Router, Request, Response } from 'express';
import { TaskService } from '../services/TaskService';
import { UserService } from '../services/UserService';
import { TaskPriority, TaskStatus } from '../models/Task';

export function createTaskRoutes(
  taskService: TaskService,
  userService: UserService
): Router {
  const router = Router();

  // Helper middleware to extract acting user from header "x-user-id"
  const getActorUser = (req: Request): any => {
    const userId = (req.headers['x-user-id'] as string) || 'user-dev-1';
    const actor = userService.getUserById(userId);
    if (!actor) {
      throw new Error(`Actor user '${userId}' not found.`);
    }
    return actor;
  };

  // GET /api/tasks - List all tasks
  router.get('/', (req: Request, res: Response) => {
    try {
      const tasks = taskService.getAllTasks();
      res.json({ success: true, count: tasks.length, data: tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/tasks/:id - Get specific task details
  router.get('/:id', (req: Request, res: Response) => {
    const task = taskService.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: task });
  });

  // POST /api/tasks - Create a new task
  router.post('/', (req: Request, res: Response) => {
    try {
      const actor = getActorUser(req);
      const { projectId, title, description, priority, assigneeId, deadline, tags } = req.body;

      if (!projectId || !title) {
        return res.status(400).json({ success: false, error: 'projectId and title are required' });
      }

      const task = taskService.createTask(actor, {
        projectId,
        title,
        description: description || '',
        priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
        assigneeId,
        deadline,
        tags
      });

      res.status(201).json({ success: true, data: task });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // PATCH /api/tasks/:id/status - Update task status (State pattern transition)
  router.patch('/:id/status', (req: Request, res: Response) => {
    try {
      const actor = getActorUser(req);
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status field is required' });
      }

      const updated = taskService.updateTaskStatus(actor, req.params.id, status as TaskStatus);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // PATCH /api/tasks/:id/assign - Assign task to user
  router.patch('/:id/assign', (req: Request, res: Response) => {
    try {
      const actor = getActorUser(req);
      const { assigneeId } = req.body;
      const updated = taskService.assignTask(actor, req.params.id, assigneeId || null);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // PATCH /api/tasks/:id/priority - Update task priority
  router.patch('/:id/priority', (req: Request, res: Response) => {
    try {
      const actor = getActorUser(req);
      const { priority } = req.body;
      const updated = taskService.updatePriority(actor, req.params.id, priority as TaskPriority);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /api/tasks/:id/comments - Add comment to task
  router.post('/:id/comments', (req: Request, res: Response) => {
    try {
      const actor = getActorUser(req);
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ success: false, error: 'Comment content is required' });
      }
      const comment = taskService.addComment(actor, req.params.id, content);
      res.status(201).json({ success: true, data: comment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // GET /api/tasks/:id/history - Get task audit log history
  router.get('/:id/history', (req: Request, res: Response) => {
    const task = taskService.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: task.history });
  });

  // DELETE /api/tasks/:id - Delete task
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const actor = getActorUser(req);
      const success = taskService.deleteTask(actor, req.params.id);
      if (!success) return res.status(404).json({ success: false, error: 'Task not found' });
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}
