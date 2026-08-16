import { Router } from 'express';
import { UserService } from '../services/UserService';
import { UserRole } from '../models/User';

export function createRoleUserRoutes(userService: UserService): Router {
  const router = Router();

  // GET /api/users - List all users
  router.get('/', (req, res) => {
    const users = userService.getAllUsers();
    res.json({ success: true, data: users });
  });

  // GET /api/users/:id - Get specific user
  router.get('/:id', (req, res) => {
    const user = userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  });

  // POST /api/users - Create new user
  router.post('/', (req, res) => {
    try {
      const { name, email, role } = req.body;
      if (!name || !email || !role) {
        return res.status(400).json({ success: false, error: 'Name, email, and role are required' });
      }
      const user = userService.createUser(name, email, role as UserRole);
      res.status(201).json({ success: true, data: user });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // PATCH /api/users/:id/role - Update user role
  router.patch('/:id/role', (req, res) => {
    try {
      const { role } = req.body;
      const user = userService.updateUserRole(req.params.id, role as UserRole);
      res.json({ success: true, data: user });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}
