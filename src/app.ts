import express from 'express';
import cors from 'cors';
import path from 'path';

import { UserService } from './services/UserService';
import { ProjectService } from './services/ProjectService';
import { TaskService } from './services/TaskService';
import { SearchService } from './services/SearchService';
import { NotificationService } from './services/NotificationService';

import { createRoleUserRoutes } from './routes/userRoutes';
import { createProjectRoutes } from './routes/projectRoutes';
import { createTaskRoutes } from './routes/taskRoutes';
import { createSearchRoutes } from './routes/searchRoutes';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // Instantiate Core Services
  const userService = new UserService();
  const projectService = new ProjectService();
  const notificationService = new NotificationService();
  const taskService = new TaskService(undefined, userService);
  const searchService = new SearchService();

  // Mount API Routers
  app.use('/api/users', createRoleUserRoutes(userService));
  app.use('/api/projects', createProjectRoutes(projectService));
  app.use('/api/tasks', createTaskRoutes(taskService, userService));
  app.use('/api/search', createSearchRoutes(taskService, searchService));

  // Notification API Endpoint
  app.get('/api/notifications/user/:userId', (req, res) => {
    const notifications = notificationService.getUserNotifications(req.params.userId);
    res.json({ success: true, data: notifications });
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    const updated = notificationService.markAsRead(req.params.id);
    res.json({ success: true, data: updated });
  });

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      system: 'Task Management LLD Engine (Mini Jira / Trello)',
      timestamp: new Date().toISOString()
    });
  });

  return { app, userService, projectService, taskService, notificationService, searchService };
}
