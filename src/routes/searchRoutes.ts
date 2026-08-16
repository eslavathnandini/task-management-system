import { Router } from 'express';
import { TaskService } from '../services/TaskService';
import { SearchService } from '../services/SearchService';
import { TaskPriority, TaskStatus } from '../models/Task';

export function createSearchRoutes(
  taskService: TaskService,
  searchService: SearchService
): Router {
  const router = Router();

  // GET /api/search?status=TODO&priority=HIGH&query=cache&assigneeId=user-dev-1
  router.get('/', (req, res) => {
    try {
      const allTasks = taskService.getAllTasks();
      const { status, priority, assigneeId, query, deadlineBefore } = req.query;

      const filtered = searchService.searchTasks(allTasks, {
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        assigneeId: assigneeId as string,
        query: query as string,
        deadlineBefore: deadlineBefore as string
      });

      res.json({ success: true, count: filtered.length, data: filtered });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}
