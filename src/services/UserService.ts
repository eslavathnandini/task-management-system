import { InMemoryRepository } from '../repository/InMemoryRepository';
import { User, UserRole } from '../models/User';

export class UserService {
  private userRepo: InMemoryRepository<User>;

  constructor(userRepo?: InMemoryRepository<User>) {
    this.userRepo = userRepo || new InMemoryRepository<User>('users.json');
    this.seedDefaultUsers();
  }

  private seedDefaultUsers(): void {
    if (this.userRepo.findAll().length === 0) {
      const now = new Date().toISOString();
      const defaultUsers: User[] = [
        {
          id: 'user-admin-1',
          name: 'Sarah Connor (Admin)',
          email: 'admin@trello.io',
          role: UserRole.ADMIN,
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
          createdAt: now
        },
        {
          id: 'user-mgr-1',
          name: 'Alex Rivera (Manager)',
          email: 'alex.mgr@trello.io',
          role: UserRole.MANAGER,
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          createdAt: now
        },
        {
          id: 'user-dev-1',
          name: 'David Kim (Developer)',
          email: 'david.dev@trello.io',
          role: UserRole.MEMBER,
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
          createdAt: now
        },
        {
          id: 'user-dev-2',
          name: 'Elena Rostova (Designer)',
          email: 'elena.design@trello.io',
          role: UserRole.MEMBER,
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
          createdAt: now
        },
        {
          id: 'user-guest-1',
          name: 'Guest Viewer',
          email: 'guest@trello.io',
          role: UserRole.GUEST,
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
          createdAt: now
        }
      ];

      for (const u of defaultUsers) {
        this.userRepo.save(u);
      }
    }
  }

  public createUser(name: string, email: string, role: UserRole): User {
    const user: User = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      role,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString()
    };
    return this.userRepo.save(user);
  }

  public getUserById(id: string): User | null {
    return this.userRepo.findById(id);
  }

  public getAllUsers(): User[] {
    return this.userRepo.findAll();
  }

  public updateUserRole(userId: string, role: UserRole): User {
    return this.userRepo.update(userId, { role });
  }
}
