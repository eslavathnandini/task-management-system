import { InMemoryRepository } from '../repository/InMemoryRepository';
import { Project } from '../models/Project';

export class ProjectService {
  private projectRepo: InMemoryRepository<Project>;

  constructor(projectRepo?: InMemoryRepository<Project>) {
    this.projectRepo = projectRepo || new InMemoryRepository<Project>('projects.json');
    this.seedDefaultProject();
  }

  private seedDefaultProject(): void {
    if (this.projectRepo.findAll().length === 0) {
      const now = new Date().toISOString();
      const defaultProj: Project = {
        id: 'proj-core-1',
        name: 'Sprint Alpha - Engineering Board',
        key: 'ALPHA',
        description: 'Core Engineering Sprint Board for Mini Jira / Trello LLD',
        ownerId: 'user-mgr-1',
        memberIds: ['user-admin-1', 'user-mgr-1', 'user-dev-1', 'user-dev-2', 'user-guest-1'],
        createdAt: now,
        updatedAt: now
      };
      this.projectRepo.save(defaultProj);
    }
  }

  public createProject(name: string, key: string, description: string, ownerId: string): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: `proj-${Date.now()}`,
      name,
      key: key.toUpperCase(),
      description,
      ownerId,
      memberIds: [ownerId],
      createdAt: now,
      updatedAt: now
    };
    return this.projectRepo.save(project);
  }

  public getProjectById(id: string): Project | null {
    return this.projectRepo.findById(id);
  }

  public getAllProjects(): Project[] {
    return this.projectRepo.findAll();
  }

  public addMember(projectId: string, userId: string): Project {
    const proj = this.getProjectById(projectId);
    if (!proj) throw new Error(`Project ${projectId} not found`);
    if (!proj.memberIds.includes(userId)) {
      proj.memberIds.push(userId);
      proj.updatedAt = new Date().toISOString();
      return this.projectRepo.save(proj);
    }
    return proj;
  }
}
