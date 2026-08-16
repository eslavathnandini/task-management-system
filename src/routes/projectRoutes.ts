import { Router } from 'express';
import { ProjectService } from '../services/ProjectService';

export function createProjectRoutes(projectService: ProjectService): Router {
  const router = Router();

  // GET /api/projects - List projects
  router.get('/', (req, res) => {
    const projects = projectService.getAllProjects();
    res.json({ success: true, data: projects });
  });

  // GET /api/projects/:id - Get project
  router.get('/:id', (req, res) => {
    const proj = projectService.getProjectById(req.params.id);
    if (!proj) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, data: proj });
  });

  // POST /api/projects - Create project
  router.post('/', (req, res) => {
    try {
      const { name, key, description, ownerId } = req.body;
      const proj = projectService.createProject(name, key, description, ownerId);
      res.status(201).json({ success: true, data: proj });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}
